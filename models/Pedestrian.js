//Pedestrian Evacuation Model File; Eli Poppele
//currently loads image from /src folder in agentscript; change as appropriate before running
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
        age: 0,
        barriers: 0,
        timePriority: 8, //factor in turtle movement that gives value to less-often occupied patches; higher values means more priority given
      }
    }

  //danger is unused type
  setup(){
    this.patchBreeds('exits obstacles seeds paths dangers')
    this.patchTypes = [
        'exit', //turtles move towards exit and are removed once there
        'obstacle', //obstacles are impassable (at least supposed to be)
        'seed', //passable terrain that spawns turtles at start
        'path', //passable terrain between seed and exit
        'danger', //unused type for a threat that turtles move away from
    ]
    this.exitType = this.patchTypes[0]
    this.obstacleType = this.patchTypes[1]
    this.seedType = this.patchTypes[2]
    this.pathType = this.patchTypes[3]
    this.dangerType = this.patchTypes[4]
    //initialize for floodfill; all patches begin at inf. distance
    this.patches.ask(p => {
      p.distance = Infinity
      p.value = Infinity
      p.visited = 0
      p.traffic = 0
    })
    this.age = 0
    this.loadImageMap()
    this.addBarriers()
    this.fillDistance()
    this.seed()
    this.patchCheck()
  }

  //adds more random obstacles to the bottom half of the Map
  //meant for use with the marcy map to make the field past the
  //bottleneck more interesting
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

  //checks there are no obvious errors with patch values after everything is set up
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

  //Uses topo map tools to build map from a png imageMap
  //image should be square of (2*worldSize)+1 dimensions,
  //with black for paths, blue for seeds, green for exits,
  //and red for obstacles. Using pure color (0,255,0), etc is best for this.
  loadImageMap(){
    var img = new Image()
    img.src = '../src/EvacMap.png' //can be set to any appropriate image file so long as worldSize is set properly
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

  //initially fill just from exits
  //iterates through a loop which asks every patch that has a distance
  //to make sure all its neighbors are within 1 distance of it. If they
  //are not or don't have distance yet, they are given an appropriate distance.
  //this loops continuously until no change is made in one whole loop.
  //Exits start with distance zero, and paths are filled out from there.
  fillDistance(){
    this.exits.ask( e => {
      e.distance = 0
      e.visited = 0
      this.floodFill(e)
    })
    this.recentChange = true
    var count = 0
    while(this.recentChange === true){
      this.recentChange = false
      this.patches.ask( p =>{
        if(p.distance != Infinity && (p.type === this.seedType || p.type === this.pathType)){
          this.floodFill(p)
        }
      })
    }
  }

  floodFill(p){
    //check both ways; if neighbor is too far set to p+1,
    //neighbor is much shorter set p to neighbor+1
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
      }
    })
  }

  //Add all turtles before movement begins
  seed(){
    this.seeds.ask( s =>{
      if(util.randomInt(100) < this.populationDensity){
        s.sprout()
      }
    })
  }

//movement: move forward toward center of desired patch, slower when current patch has more people
//priority is based on patch traffic/model average
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
        n.value = (n.distance - t.patch.distance) + (this.timePriority)*(n.traffic/this.age)//4*(n.turtlesHere().length)  //weighted value that considers how close each patch is and how many people already there
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

    //begin with the lowest value tile as the current one, so no movement to a tile worse than your current one
    var lowest = [[(this.timePriority)*(t.patch.traffic/this.age), t.patch]] //lowest is an array so we can add any patches with a tied valued and choose one at random
    var next = null
    t.patch.neighbors.ask( n => {
      if (n.value < lowest[0][0] && n.type != this.obstacleType){
        lowest = [[n.value, n]]
      }
      else if (n.value === lowest[0][0] && n.type != this.obstacleType) {
        lowest.push([n.value, n])
      }
    })

    //pick one patch at random from the array of lowest-value patches and move to it
    next = lowest[Math.floor(Math.random() * lowest.length)][1]
    if(next != null && next != t.patch){
      t.face(next)
      t.speed = (0.8 + 0.1*util.randomInt(5))*(this.speed/((t.patch.turtlesHere().length)))//speed significantly varies based on number of turtles, and less so by random value
      t.forward(t.speed)
    }
  }



}
