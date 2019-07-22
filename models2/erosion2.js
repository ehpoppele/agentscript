import World from '../src/World.js'
import util from '../src/util.js'
import Color from '../src/Color.js'
import TwoView from '../src/TwoView.js'
import ErosionModel from '../models/ErosionModel2.js'


const timeoutMS = 0
const steps = 5000
const erosionrate = 20
const rainfall = 6
const worldSize = 70

const patchPixels = {
    dirt: [1, 0.67, 0.33],
    water: [0, 0, 1],
}

const world = World.defaultWorld((Math.floor(worldSize/2) - 1))
const model = new ErosionModel(world)
model.rainfall = rainfall
model.erosionrate = erosionrate
model.worldSize = worldSize
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
