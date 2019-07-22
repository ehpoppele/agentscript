import Model from '../src/Model.js'
import util from '../src/util.js'
import DataSet from '../src/DataSet.js'

//notes:
//issue is currently that world has odd dimensions by defaults
//to fix, try making everything work with 255, and 255//2, so we cut off the last right and bottom row of image

export default class TopoTestModel extends Model {
    static defaults() {
        return {
            worldSize: 256,
            imageURL:"https://s3-us-west-2.amazonaws.com/world-elevation-tiles/DEM_tiles/13/1684/3226.png",
        }
    }


    constructor(worldDptions) {
        super(worldDptions)
        Object.assign(this, TopoTestModel.defaults())
    }

    async startup(){
      let img = await fetch(this.imageURL)
      let imgBlob = await img.blob()
      let i = await createImageBitmap(imgBlob)
      let imageMap = this.getImageData(i, 0, 0, 256, 256)
      return new Promise( (resolve, reject) => {
        this.imageArray = this.extractRGBArray(imageMap)
        console.log(this.imageArray[0])
        console.log(this.imageArray[65000])
      resolve(this.imageArray)
      })

    }

    setup() {
        this.patchBreeds('rocks')

        this.patchTypes = [
            'rock',
        ]
        this.rockType = this.patchTypes[0]

        this.patches.ask(p => {
          p.elevation = 0
          p.height = 0
          p.type = this.rockType
          p.setBreed(this.rocks)
        })

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
        var maxHeight = 0
        var minHeight = Infinity
        this.patches.ask(p => {
          p.elevation = heightArray[(this.worldSize/2) - p.y][(this.worldSize/2) + p.x]
          if (p.elevation > maxHeight) maxHeight = p.elevation
          if (p.elevation < minHeight) minHeight = p.elevation
        })

        //now do the scaling work
        this.patches.ask(p => {
          p.graphElev= Math.floor(255*(p.elevation-minHeight)/(maxHeight - minHeight))
          console.log(p.graphElev)
        })


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
