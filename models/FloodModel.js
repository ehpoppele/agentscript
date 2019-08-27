//Flood Model and Basis for erosion; Eli Poppele
import Model from '../src/Model.js'
import util from '../src/util.js'
import DataSet from '../src/DataSet.js'
import * as Map from './TopoMap.js'

export default class FloodModel extends Model {
    static defaults() {
        return {
            age: 0, //Tracks time; elapsed time = (age/timeScale) minutes
            worldSize: 30,
            imageURL:"https://s3-us-west-2.amazonaws.com/world-elevation-tiles/DEM_tiles/13/1686/3229.png",
            rainfall: 10, //mm of rain per hour
            edgeRunoff: true, //whether water runs off the edge of the map, treating the "offscreen pixels" as lower elevation
            timeScale: 2,//number of steps between rainfalls; time to flow one patch is 1 min / timeScale.
            //For accuracy on time scale, it should be set to:
            //patch size = k /(zoom * world Size), where mapSideLength(m) = k/zoom
            // waterrate = timescale * patch size/60s
            //timeScale = waterRate * 60 * zoom * worldSize/ (k)
            //for standard zoom 12, worldsize 70, this is:
            //timescale = 3 m/s * 60 * 12 * 70 /(7500 * 12)
        }
    }

    constructor(worldOptions) {
        super(worldOptions)
        Object.assign(this, FloodModel.defaults())
    }

    //Startup function loads image for worldmap through TopoMap file
    async startup(){
      let img = await fetch(this.imageURL)
      let imgBlob = await img.blob()
      let i = await createImageBitmap(imgBlob)
      let imageMap = Map.getImageData(i, 0, 0, 256, 256)
      return new Promise( (resolve, reject) => {
        this.imageArray = Map.extractRGBArray(imageMap, 0, 1, this.worldSize)
      resolve(this.imageArray)
      })
    }

    setup() {
        //initialize patches and types
        this.patchBreeds('waters rocks')
        this.patchTypes = [
            'rock', //normal terrain
            'rainWater', //water < 0.1m in depth, causes less erosion and does not display
            'floodWater', //water > 0.1m in depth, visible as blue on map
        ]
        this.rockType = this.patchTypes[0]
        this.rainWaterType = this.patchTypes[1]
        this.floodWaterType = this.patchTypes[2]
        this.patches.ask(p => {
          p.elevation = 0 //measure in decimeters
          p.floodDepth = 0 //measured in decimeters
          p.rainDepth = 0 //measured in millimeters
          p.type = this.rockType
          p.setBreed(this.rocks)
        })

        //Resample and build array from loaded image
        var heightDataSet = new DataSet(256, 256, this.imageArray)
        heightDataSet = heightDataSet.resample(this.worldSize, this.worldSize)
        var heightArray = []
        var h = 0
        for (var j = 0; j < this.worldSize; j++) {
          heightArray[j] = []
          for (var k = 0; k < this.worldSize; k++) {
              heightArray[j][k] = heightDataSet.data[h]
              h++
          }
        }

        //Arrays are a little funky here, so ordering looks weird
        this.maxHeight = 0
        this.minHeight = Infinity
        this.patches.ask(p => {
          p.elevation = heightArray[(this.worldSize/2) - p.y][(this.worldSize/2) + p.x]
          if (p.elevation > this.maxHeight) this.maxHeight = p.elevation
          if (p.elevation < this.minHeight) this.minHeight = p.elevation
        })

        //Set display of patches to match relative elevation
        this.patches.ask(p => {
          p.graphElev= this.rockGraphic(p.elevation)
        })
      }

    step(){
      //log console information to provide data for length/severity of flood
      this.age ++
      if(this.age % 120 ===0){
        console.log(String(this.age/120) + ' hours elapsed')
        var total = 0
        var count = 0
        this.patches.ask(p => {
          if(p.type === this.floodWaterType){
            total += p.floodDepth
            count++
          }
        })
        console.log('Average flood water depth is ' + String(total/(count*10)) +' meters') //average flood water depth
      }
      this.waters.ask( w => {
        this.flow(w)
        })

      //Rain on all patches every few steps/ 1 minute by adding rainwater depth
      if (this.age % this.timeScale === 0){
        this.patches.ask(p => {
          p.rainDepth += (this.rainfall)/60
          if(p.type === this.rockType && p.rainDepth > 0){
            p.type = this.rainWaterType
            p.setBreed(this.waters)
          }
          if (p.rainDepth >= 100){
            p.rainDepth = 0
            p.floodDepth += 1
            p.type = this.floodWaterType
            p.graphElev = this.waterGraphic(p.elevation, p.floodDepth)
          }
        })
        }
      }


    flow(p) {
      //Floodwater often has rainwater depth on top of it, so flood drains to rain drains to rock

      //if edgeRunoff is set, tiles just off the map are assumed to be lower in elevation than their neighbors on the edge
      //not completely realistic, but somewhat as any given tile is likely part of a larger watershed that it should drain to
      if(this.edgeRunoff === true && (p.x === this.world.minX || p.x === this.world.maxX || p.y === this.world.minY || p.y === this.world.maxY)){
        if(p.type === this.rainWaterType){
          p.rainDepth = 0
          p.type = this.rockType
          p.setBreed(this.rocks)
          p.graphElev = this.rockGraphic(p.elevation)
        }
        if(p.type === this.floodWaterType){
          p.floodDepth -= 1
          p.graphElev = this.waterGraphic(p.elevation, p.floodDepth)
          if(p.floodDepth <= 0){
            p.type = this.rainWaterType
            if(p.rainDepth <= 0){
              p.type = this.rockType
              p.setBreed(this.rocks)
              p.graphElev = this.rockGraphic(p.elevation)
            }
          }
        }
      }

      //initialize movement variables
      var options = 0
      var count = 0
      var found = null //patch of lower elevation that is chosen to move to

      //find number of possible tiles to flow to
      p.neighbors.ask ( n => {
        if ((n.type === this.floodWaterType && (n.floodDepth + n.elevation) < (p.floodDepth + p.elevation)) || (n.type != this.floodWaterType && (n.floodDepth + n.elevation + 1) < (p.floodDepth + p.elevation))){
          options ++
        }
      })
      //iterate over these again, trying each one with increasing random odds
      //this leads to fully random selection, as we give each tile 1 in (# of remaining tiles) odds
      p.neighbors.ask ( n => {
        if ((n.type === this.floodWaterType && (n.floodDepth + n.elevation) < (p.floodDepth + p.elevation)) || (n.type != this.floodWaterType && (n.floodDepth + n.elevation + 1) < (p.floodDepth + p.elevation))){
          if (found === null && util.randomInt(options - count) === 0){
            found = n
          }
          count++
        }
      })


      //move as long as possible in each step; separate cases for each rainwater type to deal with how their water adds to next tile;
      //general movement behavior is same for flood v rain water
      while (found != null && p.type != this.rockType) {
        if(p.type === this.rainWaterType){
          p.type = this.rockType
          p.setBreed(this.rocks)
          p.graphElev = this.rockGraphic(p.elevation)
          found.rainDepth += p.rainDepth
          p.rainDepth = 0
          if (found.type === this.rockType) {
            found.type = this.rainWaterType
            found.setBreed(this.waters)
          }
          if (found.rainDepth >= 100){
            p.rainDepth = 0
            p.floodDepth += 1
            p.type = this.floodWaterType
            p.graphElev = this.waterGraphic(p.elevation, p.floodDepth)
          }
        }

        else if (p.type === this.floodWaterType) {
          p.floodDepth -= 1
          p.graphElev = this.waterGraphic(p.elevation, p.floodDepth)
          if (p.floodDepth <= 0) {
            p.type = this.rainWaterType
            if (p.rainDepth <= 0){
              p.type = this.rockType
              p.setBreed(this.rocks)
            }
            p.graphElev = this.rockGraphic(p.elevation)
          }
          found.floodDepth += 1
          if (found.type != this.floodWaterType){
            found.type = this.floodWaterType
            found.setBreed(this.waters)
            found.graphElev = this.waterGraphic(found.elevation, found.floodDepth)
          }
        }

        //update variables and movement options again before restarting loop
        var options = 0
        var count = 0
        var found = null
        p.neighbors.ask ( n => {
          if ((n.type === this.floodWaterType && (n.floodDepth + n.elevation) < (p.floodDepth + p.elevation)) || (n.type != this.floodWaterType && (n.floodDepth + n.elevation + 1) < (p.floodDepth + p.elevation))){
            options ++
          }
        })
        p.neighbors.ask ( n => {
          if ((n.type === this.floodWaterType && (n.floodDepth + n.elevation) < (p.floodDepth + p.elevation)) || (n.type != this.floodWaterType && (n.floodDepth + n.elevation + 1) < (p.floodDepth + p.elevation))){
            if (found === null && util.randomInt(options - count) === 0){
              found = n
            }
            count++
          }
        })
      }
    }

    //helper functions to return appropriate graph elevation for each types
    //graph elevation is always drawn with respecct to relative minimums and maximums of the map, regardless of overall real world elevation
    waterGraphic(elevation, depth){
      return Math.floor(255*(elevation-this.minHeight+depth)/(this.maxHeight - this.minHeight))
    }
    rockGraphic(elevation){
      return Math.floor(255*(elevation-this.minHeight)/(this.maxHeight - this.minHeight))
    }
}
