import Model from '../src/Model.js'
import DataSet from '../src/DataSet.js'
import util from '../src/util.js'

export default class ErosionModel extends Model {
    static defaults() {
        return {
            worldSize: 30,
            rainfall: 6, // tenths of percent
            erosionrate: 50, // percent
            imageURL:"https://s3-us-west-2.amazonaws.com/world-elevation-tiles/DEM_tiles/13/1686/3229.png",
        }
    }

    // ======================

    constructor(worldDptions) {
        super(worldDptions)
        Object.assign(this, ErosionModel.defaults())
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
        this.patchBreeds('waters dirts')

        this.patchTypes = [
            'dirt',
            'water',
        ]
        this.dirtType = this.patchTypes[0]
        this.waterType = this.patchTypes[1]

        this.patches.ask(p => {
          p.elevation = -1
          p.type = this.dirtType
          p.setBreed(this.dirts)
        })


        //-------------------
        //Map setup

        /*
        this.patches.ask(p => {
          p.elevation = Math.floor(250*( Math.max(Math.abs(p.x), Math.abs(p.y))/this.worldSize ))
          p.graphElev = p.elevation
          p.effectiveElevation = p.elevation
        })
        */

        /*
        this.patches.ask(p => {
          p.elevation =  Math.floor(250*(Math.abs(p.x - p.y)/(2*this.worldSize)))
          if (p.elevation < 30) p.elevation = 5
          p.graphElev = p.elevation
          p.effectiveElevation = p.elevation
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
          p.elevation = Math.floor(255*(p.elevation-this.minHeight)/(this.maxHeight - this.minHeight))
          p.effectiveElevation = p.elevation
          p.graphElev = p.elevation
          p.hp = Math.floor(100/this.erosionrate)
          p.sediment = 0
        })

      }




        step(age) {

          //produce new rain
          if (age===1){
            var total = 0
            this.patches.ask( p=> {
              total += p.elevation
            })
            console.log(total)
          }
          if (age===4000){
            var total = 0
            this.patches.ask( p=> {
              total += p.elevation
            })
              console.log(total)
          }

          if (age === 1500) {
            console.log(`Done Raining`)
            this.patches.ask(p => {
              console.log(p.elevation, p.effectiveElevation)
            })
          }
          if (age < 1500){
            this.patches.ask(p => {
              if (util.randomInt(1000)<this.rainfall) this.addWater(p)
            })
          }
          else{
            this.waters.ask( p=> {
              this.dry(p)
            })
          }

          this.waters.ask( w => {
            this.flow(w)
          })

        }



        flow(p){
          //dry out chance
          /*
          if (util.randomInt(100) < 10){
            p.effectiveElevation -=1
            if (p.effectiveElevation <= p.elevation){
              p.type = this.dirtType
              p.setBreed(this.dirts)
              p.graphElev = p.elevation
              if(p.carryingSediment){
                p.carryingSediment = false
                //p.elevation += 1
                //p.effectiveElevation +=1
              }
              }
            }
            */

          var canMove = false
          var options = []
          p.neighbors4.ask ( n => {
            if (n.effectiveElevation < p.effectiveElevation){ //&& n.carryingSediment==false){ //second condition here may screw things up, but whole model must be adjusted to fix
            canMove = true
            options.push(n)
            }
          })

          if (canMove){
            var newPatch = util.randomInt(options.length)
            options[newPatch].type = this.waterType
            options[newPatch].setBreed(this.waters)
            options[newPatch].effectiveElevation += 1
            options[newPatch].graphElev = 250
            if (p.sediment > 0){
              options[newPatch].sediment += 1
              p.sediment -= 1
            }
            p.effectiveElevation -=1
            if (p.effectiveElevation <= p.elevation){
              p.type = this.dirtType
              p.setBreed(this.dirts)
              p.graphElev = p.elevation
              }
            p.hp -= 1

            //erode
            if (p.hp <= 0 && p.elevation > 0 && options[newPatch].sediment <= 0 ){
              p.elevation -=1
              p.effectiveElevation-=1
              options[newPatch].sediment +=1
              console.log('testing')
              if (p.type = this.dirtType){
                p.graphElev = p.elevation
              }
              if (options[newPatch].type = this.dirtType){
                options[newPatch].graphElev = options[newPatch].elevation
              }
            }

          }
          if (p.sediment>0 && canMove==false && (p.effectiveElevation - p.elevation)==1 && util.randomInt(100) < 20) {
            p.elevation += 1
            p.effectiveElevation += 1
            p.sediment -= 1
            //p.hp +=1
          }
          /*
          else if (p.x === this.world.minX || p.y === this.world.minY ||p.x === this.world.maxX ||p.y === this.world.maxY) {
            if (util.randomInt(100) < this.erosionrate && p.elevation > 0  ){
              p.elevation -=1
              p.effectiveElevation-=1
              if (p.type = this.dirtType){
                p.graphElev = p.elevation
              }
            }
          }
          */
      }

      dry(p) {
        if (util.randomInt(100) < 10){
          p.effectiveElevation -=1
          if (p.effectiveElevation <= p.elevation){
            p.type = this.dirtType
            p.setBreed(this.dirts)
            p.graphElev = p.elevation
            if(p.sediment > 0){
              p.sediment -=1
              //p.hp += 1
              p.elevation += 1
              p.effectiveElevation +=1
            }
            }
          }
      }

        addWater(p){
            if(p.type != this.waterType){
              p.type = this.waterType
              p.setBreed(this.waters)
            }
            if(p.type === this.waterType){
              p.effectiveElevation += 1
            }
            p.graphElev = 250
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
