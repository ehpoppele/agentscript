//fix patch/breed issue within array

import Model from '../src/Model.js'
import util from '../src/util.js'
import DataSet from '../src/DataSet.js'
import * as Map from './TopoMap.js'

export default class PedestrianModel extends Model {
    static defaults() {
      return {
        speed: 1,
        populationDensity: 50, //0-100 percent chance that a seed patch spawns a turtle at start
        panic: 1,
      }
    }

//setup:
//load from image map
//floodfill distance on patches
//seed turtles onto appropriate tiles
  setup(){
    this.patchBreeds('exits obstacles seeds paths')

    this.patchTypes = [
        'exit',
        'obstacle',
        'seed',
        'path',
    ]
    this.exitType = this.patchTypes[0]
    this.obstacleType = this.patchTypes[1]
    this.seedType = this.patchTypes[2]
    this.pathType = this.patchTypes[3]

    this.patches.ask(p => {
      p.distance = Infinity
      p.value = Infinity
      p.visited = 0
    })
    this.loadImageMap()
    this.fillDistance()
    this.seed()
    this.patchCheck()
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
    img.src = '../src/EvacMap.png'
    //var imgBlob = img.blob()
    //var i = createImageBitmap(imgBlob)
    var imageMap = Map.getImageData(img, 0, 0, 129, 129)
    this.imageArray = new Array(129 * 129)
    this.imageArrayBreeds = new Array(129 * 129)
    var dat = imageMap.data
    //console.log(imageMap.data)
    //var numbArray = this.imageArray
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
      for (var j = 0; j < 129; j++) {
        patchArray[j] = []
        breedArray[j] = []
        for (var k = 0; k < 129; k++) {
            patchArray[j][k] = this.imageArray[h]
            breedArray[j][k] = this.imageArrayBreeds[h]
            h++
        }
      }

      //Arrays are a little funky here, so ordering looks weird
      this.patches.ask(p => {
        p.type = patchArray[64 - p.y][64 + p.x]
        //console.log(breedArray[64 - p.y][64 + p.x])
        p.setBreed(breedArray[64 - p.y][64 + p.x])
      })
  }

  fillDistance(){
    this.exits.ask( e => {
      e.distance = 0
      e.visited = 0
      this.floodFill(e)
    })
    var notDone = true
    console.log('starting the big work')
    var count = 0
    while(notDone === true){
      count++
      if(count%10000 === 0){
        console.log(count)
      }

      notDone = false
      this.patches.ask( p =>{
        if(p.distance != Infinity && p.visited <= 1 && (p.type === this.seedType || p.type === this.pathType)){
          notDone = true
          this.floodFill(p)
        }
      })
    }
    //perform post fill
    console.log('flood finished')


  }

  floodFill(p){ //we flood fill until everything has been visited
    //but need to reset whenever a shorter path is found;
    //setting up to confirm that is lowest distance value
    //when we visit again via another route that is longer
    var changed = false

    p.neighbors4.ask( n =>{
      if(n.type === this.seedType || n.type === this.pathType){
        n.visited++
        if(n.distance > p.distance + 1){
          changed = true
          n.distance = p.distance + 1
          n.visited = 1
          console.log('shorter distance found')
        }
      }


    })
    if(changed === false){
      p.visited++
    }
    //p.visited++
  }

  seed(){
    this.seeds.ask( s =>{
      if(util.randomInt(100) < this.populationDensity){
        s.sprout()
        //add links for families and such
      }
    })
  }

//movement: move forward toward center of desired patch, slower when current patch has more people
  step(){
    this.turtles.ask(t => {
    })
    //this.turtles.ask(t => {
      //this.walk(t)
    //})
  }

  walk(t){
    //console.log(t.patch)
    t.patch.neighbors.ask( n => {
      n.value = ((t.patch.distance - n.distance)*this.panicFactor) + n.turtlesHere().length  //weighted value that considers how close each patch is and how many people already there
      if (Number.isNaN(n.value)){
          console.log('value:', n.value)
      }
    })


    var wiggle = false //roll to see if we take a suboptimal path
    if (util.randomInt(4)===0){
      wiggle = true
    }
    var lowest = [[Infinity, null]]
    var second = [[Infinity, null]]
    var next = null
    t.patch.neighbors.ask( n => {
      if (n.value < lowest[0][0]){
        lowest[0] = [n.value, n]
      }
      else if (n.value = lowest[0][0]) {
        lowest.push([n.value, n])
      }
      else if (n.value < second[0][0]) {
        second[0] = [n.value, n]
      }
      else if (n.value < second[0][0]) {
        second.push([n.value, n])
      }
    })

    if (wiggle){ //go to 2nd lowest value
      next = second[Math.floor(Math.random() * second.length)][1]
    }
    else{//go to lowest value
      next = lowest[Math.floor(Math.random() * lowest.length)][1]
    }


    console.log('next, speed', next, t.speed)
    t.face(next)
    t.speed = this.speed/((t.patch.turtlesHere().length))//second term here is the number of turtles in this patch
    t.forward(t.speed)
  }



}
