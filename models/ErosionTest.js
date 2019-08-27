//Eli Poppele
//This is a test file for the erosion model
//it is identical except it adds a large initial flood of water, to be used with rainfall = 0

import Model from '../src/Model.js'
import DataSet from '../src/DataSet.js'
import util from '../src/util.js'
import FloodModel from './FloodModel.js'

export default class ErosionModel extends FloodModel {
    static defaults() {
      return {
        erosionrate: 50,
        edgeRunoff: true,
        dryUp: false,
      }
    }

    //Extends flood model, so setup only needs to add variables for erosion
    setup(){
      super.setup()
      this.patches.ask(p => {
        p.hp = 100
        p.sediment = 0
        if(p.x > 0 && p.y > 0){
          p.floodDepth = 15
          p.type = this.floodWaterType
          p.setBreed(this.waters)
          this.redraw(p)
        }
      })
    }

        //flow must be rewritten due to number of different interactions
        flow(p) {

          //dry up can be turned on to remove all water and observe effects of the erosion, minimal though they may be
          if(this.dryUp){
            p.rainDepth = 0
            p.floodDepth = 0
            p.sediment = 0
            p.type = this.rockType
            p.setBreed(this.rocks)
            this.redraw(p)
          }

          if(this.edgeRunoff === true && (p.x === this.world.minX || p.x === this.world.maxX || p.y === this.world.minY || p.y === this.world.maxY)){
            this.flowOffMap(p)
            return null
          }

          //as with flood model, establish options of movement to lower tiles
          var options = 0
          var count = 0
          var found = null

          p.neighbors.ask ( n => {
            if ((n.type === this.floodWaterType && (n.floodDepth + n.elevation) < (p.floodDepth + p.elevation)) || (n.type != this.floodWaterType && (n.floodDepth + n.elevation + 1) < (p.floodDepth + p.elevation))){
              options ++
            }
          })
          //iterate through neighbors and randomly select one (increasing odds at each iteration give even chance overall)
          p.neighbors.ask ( n => {
            if ((n.type === this.floodWaterType && (n.floodDepth + n.elevation) < (p.floodDepth + p.elevation)) || (n.type != this.floodWaterType && (n.floodDepth + n.elevation + 1) < (p.floodDepth + p.elevation))){
              if (found === null && util.randomInt(options - count) === 0){
                found = n
              }
              count++
            }
          })

          //If no movement can be made, the carried sediment will settle
          if(found === null && p.sediment>0){
            p.sediment -= 1
            p.elevation += 1
            if (p.type === this.floodWaterType){
              this.redraw(p)
            }
            else{
              this.redraw(p)
            }
          }


          //move as long as possible
          while (found != null && p.type != this.rockType) {

            //rainwater causes minor erosion that decreases patch hp
            if(p.type === this.rainWaterType){
              p.type = this.rockType
              p.setBreed(this.rocks)
              this.redraw(p)
              found.rainDepth += p.rainDepth
              p.hp -= p.rainDepth
              p.rainDepth = 0
              if (found.type === this.rockType) {
                found.type = this.rainWaterType
                found.setBreed(this.waters)
              }
              if (p.hp <= 0){
                p.hp = 100
                p.elevation -= 1
                this.redraw(p)
                found.elevation +=1
                this.redraw(found)
              }
              //rainwater erosion always moves just to the next immediate tile
              if (found.rainDepth >= 100){
                found.rainDepth -= 100
                found.floodDepth += 1
                found.type = this.floodWaterType
                this.redraw(found)
              }
            }

            else if (p.type === this.floodWaterType) {
              p.floodDepth -= 1
              this.redraw(p)
              if (p.floodDepth <= 0) {
                p.type = this.rainWaterType
                if (p.rainDepth <= 0){
                  p.type = this.rockType
                  p.setBreed(this.rocks)
                }
                this.redraw(p)
              }
              found.floodDepth += 1
              if (found.type != this.floodWaterType){
                found.type = this.floodWaterType
                found.setBreed(this.waters)
                this.redraw(found)
              }
              //If not carrying sediment, cause erosion and pick some up
              if (p.sediment < p.floodDepth){
                found.sediment += 1
                p.elevation -= 1
                if (p.type != this.floodWaterType){
                  this.redraw(p)
                }
                else{
                  this.redraw(p)
                }
              }
              //otherwise sediment transfers with water
              else{
                p.sediment -= 1
                found.sediment += 1
              }
            }

            //update options for movement again
            if(this.edgeRunoff === true && (p.x === this.world.minX || p.x === this.world.maxX || p.y === this.world.minY || p.y === this.world.maxY)){
              this.flowOffMap(p)
              return null
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
          }
        }

        flowOffMap(p){
          if(p.type === this.rainWaterType){
            p.sediment = 0
            p.hp -= p.rainDepth
            p.rainDepth = 0
            p.type = this.rockType
            p.setBreed(this.rocks)
            this.redraw(p)
            if (p.hp <= 0){
              p.hp = 100
              p.elevation -= 1
              this.redraw(p)
            }
          }
          if(p.type === this.floodWaterType){
            p.floodDepth -= 1
            this.redraw(p)
            if(p.floodDepth <= 0){
              p.type = this.rainWaterType
              if(p.rainDepth <= 0){
                p.type = this.rockType
                p.setBreed(this.rocks)
              }
              this.redraw(p)
            }
            if (p.sediment === 0){
              p.elevation -= 1
              if (p.type != this.floodWaterType){
                this.redraw(p)
              }
              else{
                this.redraw(p)
              }
            }
            else{
              p.sediemnt -=1
            }
          }
          if(p.elevation < 0){
            p.elevation = 0
          }
        }

        //reassign the graph elevation of a patch based on type and relative elevation
        redraw(p){
          if(p.type === this.floodWaterType){
            p.graphElev = this.waterGraphic(p.elevation, p.floodDepth)
          }
          else{
            p.graphElev = this.rockGraphic(p.elevation)
          }
        }

}
