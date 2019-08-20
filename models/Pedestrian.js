import Model from '../src/Model.js'
import util from '../src/util.js'
import DataSet from '../src/DataSet.js'
import * as Map from './TopoMap.js'

export default class PedestrianModel extends Model {
    static defaults() {
      return {
        worldSize: 64,
        speed: 1,
        populationDensity: 50, //0-100 percent chance that a seed patch spawns a turtle at start
        dangerSize: 20,
        age: 0,
        barriers: 0,
        timePriority: 8,
      }
    }

  setup(){
    this.patchBreeds('exits obstacles seeds paths dangers')
    this.patchTypes = [
        'exit',
        'obstacle',
        'seed',
        'path',
        'danger',
    ]
    this.exitType = this.patchTypes[0]
    this.obstacleType = this.patchTypes[1]
    this.seedType = this.patchTypes[2]
    this.pathType = this.patchTypes[3]
    this.dangerType = this.patchTypes[4]
    this.patches.ask(p => {
      p.distance = Infinity
      p.value = Infinity
      p.visited = 0
      p.traffic = 0
    })
    this.age =
    this.loadImageMap()
    this.addBarriers()
    this.fillDistance()
    this.seed()
    this.patchCheck()
  }

  addBarriers(){
    var i
    for(i = 0; i < this.barriers; i++){
        var xCor = util.randomInt((this.worldSize*2)+1) - this.worldSize
        var yCor = -5-(util.randomInt(this.worldSize-10))
        this.patches.ask( p => {
          if( p.x === xCor && p.y === yCor){
            p.type = this.obstacleType
            p.setBreed(this.obstacles)
            p.neighbors.ask( n => {
              n.type = this.obstacleType
              n.setBreed(this.obstacles)
              n.neighbors.ask( s => {
                s.type = this.obstacleType
                s.setBreed(this.obstacles)
              })
            })
          }
        })
    }
  }

  addDanger(){
      var xCor = util.randomInt((this.worldSize * 2)+1) - this.worldSize
      var yCor = util.randomInt((this.worldSize * 2)+1) - this.worldSize
      this.patches.ask( p => {
        if(p.x === xCor && p.y === yCor){
          p.type = this.dangerType
          p.setBreed(this.dangers)
          var count = this.dangerSize
          console.log(this.dangerSize)
          while (count > 0){
            this.dangers.ask(d =>{
              d.distance += 4
              d.neighbors4.ask( n =>{
                n.type = this.dangerType
              })
            })
            this.patches.ask( p => {
              if(p.type === this.dangerType){
                p.setBreed(this.dangers)
              }
            })
            count -= 1
          }
          this.dangers.ask( d => {
            d.distance += 4
          })
        }
      })
  }

  patchCheck(){
    this.exits.ask( e =>{
      if (e.distance != 0){
        console.log('error with an exit')
      }
    })

    this.paths.ask( p =>{
      if (p.distance < 1 || p.distance > 999999){
        console.log('error with a path')
        p.type = this.obstacleType
        p.setBreed(this.obstacles)
      }
    })

    this.seeds.ask( s =>{
      if (s.distance < 1 || s.distance > 999999){
        console.log('error with a seed')
        s.type = this.obstacleType
        s.setBreed(this.obstacles)
      }
    })

    this.obstacles.ask( o =>{
      if (o.distance != Infinity){
        console.log('error with an obstacle')
      }
    })
  }

  loadImageMap(){
    var img = new Image()
    img.src = '../src/MarcyLarge.png'
    var imageMap = Map.getImageData(img, 0, 0, (this.worldSize * 2)+1, (this.worldSize * 2)+1)
    this.imageArray = new Array(((this.worldSize * 2)+1) * ((this.worldSize * 2)+1))
    this.imageArrayBreeds = new Array(((this.worldSize * 2)+1) * ((this.worldSize * 2)+1))
    var dat = imageMap.data
    for (var i = 0; i < dat.length; i += 4) {
      var patch = null
      var breed = null
      if (dat[i] === 255){
        patch = 'obstacle'
        breed = this.obstacles
      }
      else if (dat[i+1] === 255){
        patch = 'exit'
        breed = this.exits
      }
      else if (dat[i+2] === 255){
        patch = 'seed'
        breed = this.seeds
      }
      else{
        patch = 'path'
        breed = this.paths
      }
        this.imageArray[Math.floor(i / 4)] = patch
        this.imageArrayBreeds[Math.floor(i / 4)] = breed
      }
      var patchArray = []
      var breedArray = []
      var h = 0
      for (var j = 0; j < (this.worldSize * 2)+1; j++) {
        patchArray[j] = []
        breedArray[j] = []
        for (var k = 0; k < (this.worldSize * 2)+1; k++) {
            patchArray[j][k] = this.imageArray[h]
            breedArray[j][k] = this.imageArrayBreeds[h]
            h++
        }
      }

      //Arrays are a little funky here, so ordering looks weird
      this.patches.ask(p => {
        p.type = patchArray[this.worldSize - p.y][this.worldSize + p.x]
        //console.log(breedArray[this.worldSize - p.y][this.worldSize + p.x])
        p.setBreed(breedArray[this.worldSize - p.y][this.worldSize + p.x])
      })
  }

  fillDistance(){
    this.exits.ask( e => {
      e.distance = 0
      e.visited = 0
      this.floodFill(e)
    })
    this.recentChange = true
    //console.log('starting the big work')
    var count = 0
    while(this.recentChange === true){
      this.recentChange = false
      this.patches.ask( p =>{
        if(p.distance != Infinity && (p.type === this.seedType || p.type === this.pathType)){
          this.floodFill(p)
        }
      })
    }
    //console.log('flood finished')
  }

  floodFill(p){ //we flood fill until everything has been visited
    //but need to reset whenever a shorter path is found;
    //setting up to confirm that is lowest distance value
    //when we visit again via another route that is longer
    p.neighbors4.ask( n =>{
      if(n.type === this.seedType || n.type === this.pathType){
        if(n.distance > p.distance + 1){
          this.recentChange = true
          n.distance = p.distance + 1
        }
        else if(p.distance > n.distance + 1){
          p.distance = n.distance + 1
          this.recentChange = true
        }
          //console.log('shorter distance found')

      }
    })
  }

  seed(){
    this.seeds.ask( s =>{
      if(util.randomInt(100) < this.populationDensity){
        s.sprout()
      }
    })
  }

//movement: move forward toward center of desired patch, slower when current patch has more people
  step(){
    this.age++
    this.turtles.ask(t => {
      this.walk(t)
    })
    this.patches.ask( p => {
      if(p.turtlesHere().length === 0){
        p.reset += 1
        if(p.reset > 2){
          p.reset = 0
          p.traffic = 0
        }
      }
    })
  }

  walk(t){
    if(t.patch.type === this.exitType){
      t.die()
    }
    t.patch.traffic++

    //checks various conditions and updates the value of each nearby patch
    t.patch.neighbors.ask( n => {
      //obstacles are impassable
      if(n.type === this.obstacleType){
        n.value = Infinity
      }
      //otherwise write distance based on average-time and distance formula
      else{
        n.value = (n.distance - t.patch.distance) + (this.timePriority)*(n.traffic/this.age) //4*(n.turtlesHere().length)  //weighted value that considers how close each patch is and how many people already there
      }
      //block passage if patch has too many turtles
      if(n.turtlesHere().length > 2){
        n.value = Infinity
      }
      //prioritize exit patches at end to avoid ridiculous behavior
      if(n.type === this.exitType){
        n.value = -100
      }
    })

    var lowest = [[(this.timePriority)*(t.patch.traffic/this.age), t.patch]]
    var next = null
    t.patch.neighbors.ask( n => {
      if (n.value < lowest[0][0] && n.type != this.obstacleType){
        lowest = [[n.value, n]]
      }
      else if (n.value === lowest[0][0] && n.type != this.obstacleType) {
        lowest.push([n.value, n])
      }
    })

    next = lowest[Math.floor(Math.random() * lowest.length)][1]
    if(next != null && next != t.patch){
      t.face(next)
      t.speed = (0.8 + 0.1*util.randomInt(5))*(this.speed/((t.patch.turtlesHere().length)))//second term here is the number of turtles in this patch
      t.forward(t.speed)
    }
  }



}