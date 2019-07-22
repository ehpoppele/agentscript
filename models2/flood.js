import World from '../src/World.js'
import util from '../src/util.js'
import Color from '../src/Color.js'
import TwoView from '../src/TwoView.js'
import FloodModel from '../models/FloodModel.js'

//set default params
const params = {
    worldSize: 70,
    steps: 500,
    rainfall: 10,
    intialWater: 40,
    modelZ: '13',
    modelX: '1686',
    modelY: '3229',
    edgeRunoff: false,
}

const timeoutMS = 0

const patchPixels = {
    rock: [1, 0.66, 0.33],
    water: [0, 0, 1],
}

Object.assign(params, util.parseQueryString())
console.log(params.test)
const world = World.defaultWorld((Math.floor(params.worldSize/2) - 1))
const model = new FloodModel(world)

model.worldSize = params.worldSize
model.initialWater = params.initialWater
model.rainfall = params.rainfall
model.edgeRunoff = params.edgeRunoff
model.imageURL = 'https://s3-us-west-2.amazonaws.com/world-elevation-tiles/DEM_tiles/'.concat(params.modelZ, '/', params.modelX, '/', params.modelY, '.png')
const steps = params.steps

//model.setup()
const view = new TwoView(document.body, world)
util.toWindow({ model, view, patchPixels, Color, util })

var age = 0
const perf = util.fps()
async function run() {
  await model.startup()
  model.setup()

  util.timeoutLoop(
      () => {


          view.clear()
          view.drawPatches(model.patches, p => Color.rgbaToPixel((p.graphElev*(patchPixels[p.type][0]) ),(p.graphElev*patchPixels[p.type][1]),(p.graphElev*patchPixels[p.type][2])))
          perf()

          age++
          model.step(age)
          model.tick()
      },
      steps,
      timeoutMS
  ).then(() => {
      console.log(`Done, steps: ${perf.steps}, fps: ${perf.fps}`)
      view.idle()
  })
}

run().then(() => console.log('done'))
