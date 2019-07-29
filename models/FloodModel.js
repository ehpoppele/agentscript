import Model from '../src/Model.js'
import util from '../src/util.js'
import DataSet from '../src/DataSet.js'


export default class FloodModel extends Model {
    static defaults() {
        return {
            worldSize: 30,
            imageURL:"https://s3-us-west-2.amazonaws.com/world-elevation-tiles/DEM_tiles/13/1686/3229.png",
            rainfall: 10, //mm of rain per hour
            edgeRunoff: true, //whether water runs off the edge of the map, treating the "offscreen pixels" as lower elevation
        }
    }

    constructor(worldOptions) {
        super(worldOptions)
        Object.assign(this, FloodModel.defaults())
    }

    async startup(){
      let img = await fetch(this.imageURL)
      let imgBlob = await img.blob()
      let i = await createImageBitmap(imgBlob)
      let imageMap = this.getImageData(i, 0, 0, 256, 256)
      return new Promise( (resolve, reject) => {
        this.imageArray = this.extractRGBArray(imageMap)
      resolve(this.imageArray)
      })
    }

    setup() {
        this.patchBreeds('waters rocks')

        this.patchTypes = [
            'rock',
            'rainWater',
            'floodWater',
        ]
        this.rockType = this.patchTypes[0]
        this.rainWaterType = this.patchTypes[1]
        this.floodWaterType = this.patchTypes[2]

        this.patches.ask(p => {
          p.elevation = 0
          p.floodDepth = 0
          p.rainDepth = 0
          p.type = this.rockType
          p.setBreed(this.rocks)
        })


        //Setup Canyon Terrain
        /*
        this.patches.ask(p => {
          p.elevation =  Math.floor(250*(Math.abs(p.x - p.y)/(2*this.worldSize)))
          if (p.elevation < 30) p.elevation = 5
          p.graphElev = p.elevation
        })
        */



        //One Large Hill------------------------------------------
        /*
        this.patches.ask(p => {
          p.elevation = Math.floor(210 - Math.hypot(p.x, p.y)) //25-|dist from origin |
          if (p.elevation < 0) p.elevation = 0
          p.graphElev = p.elevation
        })
        */

        //Random Mountains and Valleys


        /*
        this.patches.ask(p => {
          if (util.randomInt(1000) === 314){
              p.elevation+=50
              p.neighbors.ask(n => {
                if (util.randomInt(4) === 1) p.elevation +=50
              })
          }
        })
        */



        //ImageTile Setup
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

        //now do the scaling work
        this.patches.ask(p => {
          p.graphElev= Math.floor(255*(p.elevation-this.minHeight)/(this.maxHeight - this.minHeight))
        })








        //setup initial water
        /*
        this.patches.ask(p => {
          if (p.graphElev > 200){
            p.type = this.waterType
            p.setBreed(this.waters)
            p.height += this.initialWater
            p.graphElev = p.height
          }
        })
        */

        /*
        this.patches.ask( p=> {
          if (p.x === 0 && p.y ===0 ) {
            p.type = this.waterType
            p.setBreed(this.waters)
            p.height += this.initialWater
            p.graphElev = p.height
          }
        })
        */


      }

//---------------------------------------------
    step(age=0) {
      if (age === 400) {
        console.log(`Done Raining`)
      }

      //rain
      if (age < 400){
        this.patches.ask(p => {
          p.rainDepth += this.rainfall
          if(p.type === this.rockType && p.rainDepth > 0){
            p.type = this.rainWaterType
            p.setBreed(this.waters)
          }
          if (p.rainDepth >= 100){
            p.rainDepth = 0
            p.floodDepth += 1
            p.type = this.floodWaterType
            p.graphElev= Math.floor(255*(p.elevation-this.minHeight+p.floodDepth)/(this.maxHeight - this.minHeight))
          }
        })
      }

      this.waters.ask( w => {
        this.flow(w)
        })
      }


    flow(p) {

      if(this.edgeRunoff === true && (p.x === this.world.minX || p.x === this.world.maxX || p.y === this.world.minY || p.y === this.world.maxY)){
        if(p.type = this.rainWaterType){
          p.rainDepth = 0
          p.type = this.rockType
          p.setBreed(this.rocks)
          p.graphElev = Math.floor(255*(p.elevation-this.minHeight)/(this.maxHeight - this.minHeight))
        }
        if(p.type = this.floodWaterType){
          p.floodDepth -= 1
          p.graphElev= Math.floor(255*(p.elevation-this.minHeight+p.floodDepth)/(this.maxHeight - this.minHeight))
          if(p.floodDepth >= 0){
            p.type = this.rainWaterType
            if(p.rainDepth >= 0){
              p.type = this.rockType
              p.setBreed(this.rocks)
              p.graphElev = Math.floor(255*(p.elevation-this.minHeight)/(this.maxHeight - this.minHeight))
            }
          }
        }
      }

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

      
      //move as long as possible
      while (found != null && p.type != this.rockType) {
        if(p.type === this.rainWaterType){
          p.type = this.rockType
          p.setBreed(this.rocks)
          p.graphElev = Math.floor(255*(p.elevation-this.minHeight)/(this.maxHeight - this.minHeight))
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
            p.graphElev= Math.floor(255*(p.elevation-this.minHeight+p.floodDepth)/(this.maxHeight - this.minHeight))
          }
        }

        else if (p.type === this.floodWaterType) {
          p.floodDepth -= 1
          p.graphElev= Math.floor(255*(p.elevation-this.minHeight+p.floodDepth)/(this.maxHeight - this.minHeight)) //p.graphElev += 1 //p.height
          if (p.floodDepth <= 0) {
            p.type = this.rainWaterType
            if (p.rainDepth <= 0){
              p.type = this.rockType
              p.setBreed(this.rocks)
            }
            p.graphElev = Math.floor(255*(p.elevation-this.minHeight)/(this.maxHeight - this.minHeight))
          }
          found.floodDepth += 1
          if (found.type != this.floodWaterType){
            found.type = this.floodWaterType
            found.setBreed(this.waters)
            found.graphElev= Math.floor(255*(found.elevation-this.minHeight + found.floodDepth)/(this.maxHeight - this.minHeight)) //next[choice].graphElev += 1 // next[choice].height
          }
        }

        //update
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



    getContext2d (img, offsetx, offsety, newwidth, newheight) {
      var w = newwidth || img.width
      var h = newheight || img.height
      var can = new OffscreenCanvas(w, h, { alpha: false })
      var ctx = can.getContext('2d')
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      return ctx
    }

    getImageData(img, offsetx, offsety, newwidth, newheight) {
      var ctx = this.getContext2d(img, offsetx, offsety, newwidth, newheight)
      var imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
      return imgData
    }

    extractRGBArray(imageData, addition, multiplier) {
      addition = addition || 0
      multiplier = multiplier || 1
      var imgdat = imageData
      var numbArray = new Array(this.worldSize * this.worldSize)
      var dat = imgdat.data
      for (var i = 0; i < dat.length; i += 4) {
        var rgb = [dat[i], dat[i + 1], dat[i + 2]]
        var numb = this.rgb2Number(rgb) * multiplier + addition
        if (dat[i + 3] < 250) {
            //white background or opacity means no data to me.
            numb = -1
          }
          if (rgb[0] >= 255 && rgb[1] >= 255 && rgb[2] >= 255) {
            numb = -1
          }
          numbArray[Math.floor(i / 4)] = numb
        }
        return numbArray
}

rgb2Number(rgb) {
  var n = rgb[0] * 256 * 256 + rgb[1] * 256 + rgb[2]
  return n
}


}
