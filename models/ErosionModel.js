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

    setup(){
      super.setup()
      this.patches.ask(p => {
        p.hp = 100
        p.sediment = 0
      })
    }


        flow(p) {
          if(this.dryUp){
            p.rainDepth = 0
            if(p.sediemnt > 0){
              p.sediemnt -= 1
              p.elevation += 1
            }
            if(p.floodDepth > 0){
                p.floodDepth -= 1
                p.graphElev = this.waterGraphic(p.elevation, p.floodDepth)
                if(p.floodDepth <= 0){
                  p.type = this.rockType
                  p.graphElev = this.rockGraphic(p.elevation)
                }
            }
            else{
              p.type = this.rockType
              p.graphElev = this.rockGraphic(p.elevation)
            }
          }

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

          if(found === null && p.sediment>0){
            p.sediment -= 1
            p.elevation += 1
            if (p.type === this.floodWaterType){
              p.graphElev = this.waterGraphic(p.elevation, p.floodDepth)
            }
            else{
              p.graphElev = this.rockGraphic(p.elevation)
            }
          }


          //move as long as possible
          while (found != null && p.type != this.rockType) {

            if(this.edgeRunoff === true && (p.x === this.world.minX || p.x === this.world.maxX || p.y === this.world.minY || p.y === this.world.maxY)){
              console.log('something is wrong')
            }

            if(p.type === this.rainWaterType){
              p.type = this.rockType
              p.setBreed(this.rocks)
              p.graphElev = this.rockGraphic(p.elevation)
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
                p.graphElev = this.rockGraphic(p.elevation)
                found.elevation +=1
                found.graphElev = this.rockGraphic(found.elevation)
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
              if (p.sediment === 0){
                found.sediment += 1
                p.elevation -= 1
                if (p.type != this.floodWaterType){
                  p.graphElev = this.rockGraphic(p.elevation)
                }
                else{
                  p.graphElev = this.waterGraphic(p.elevation, p.floodDepth)
                }
              }
              else{
                p.sediment -= 1
                found.sediment += 1
              }
            }

            //update
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
            p.graphElev = this.rockGraphic(p.elevation)
            if (p.hp <= 0){
              p.hp = 100
              p.elevation -= 1
              p.graphElev = this.rockGraphic(p.elevation)
            }
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
            if (p.sediment === 0){
              p.elevation -= 1
              if (p.type != this.floodWaterType){
                p.graphElev = this.rockGraphic(p.elevation)
              }
              else{
                p.graphElev = this.waterGraphic(p.elevation, p.floodDepth)
              }
            }
            else{
              p.sediemnt -=1
            }
          }
        }


}
