//erosion itself in the model does not currently work well
//Currently, rainwater wears down a patch, then pushes one unit of height
//into the immediate next tile once patch "hp" is too low,
//the idea being shallow/slow water can't carry sediment far.
//flood water can erode a whole unit of height in one go, and
//then carries it as sediment in the water. Once the water in the tile
//has no options for movement, the sediment will settle
//despite sediement being able to flow off the edge of the map,
//this still seems to usually result in rivers and other natural waterways
//becoming shallower and filled with sediment, rather than more eroded over time.

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
                found.graphElev = this.rockGraphic(found.elevation)
              }
              //rainwater erosion always moves just to the next immediate tile
              if (found.rainDepth >= 100){
                found.rainDepth -= 100
                found.floodDepth += 1
                found.type = this.floodWaterType
                found.graphElev = this.waterGraphic(p.elevation, p.floodDepth)
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
                found.graphElev = this.waterGraphic(found.elevation, found.floodDepth)
              }
              //If not carrying sediment, cause erosion and pick some up
              if (p.sediment === 0){
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
