//run file for erosion model; Eli Poppele
//very similar to flood gui model; similar
//display and run methods
import World from '../src/World.js'
import Color from '../src/Color.js'
import ColorMap from '../src/ColorMap.js'
import Animator from '../src/Animator.js'
import GUI from '../src/GUI.js'
import TwoView from '../src/TwoView.js'
import ErosionModel from '../models/ErosionTest.js'
import util from '../src/util.js'
util.toWindow({ Color, ColorMap, Animator, GUI, TwoView, ErosionModel, util })

//gui template and defaults
const template = {
    rainfallRate: { value: 10, extent: [0, 25, 1] },
    patchSize: { value: 12, extent: [1, 20, 1] },
    edgeRunoff: { value: true},
    dryUp: { value: false},
    run: { value: () => anim.toggle() },
}
const controls = new GUI(template).target

class ErosionModelCtrl extends ErosionModel {
    step() {
        this.rainfall = controls.rainfallRate
        this.edgeRunoff = controls.edgeRunoff
        this.dryUp = controls.dryUp
        super.step()
      }
  }


  //set default params
  const params = {
      worldSize: 70,
      steps: 500,
      rainfall: 10,
      intialWater: 40,
      modelZ: '13', //12
      modelX: '1687', //843
      modelY: '3229', //1614
      edgeRunoff: false,
  }

  const timeoutMS = 0

  //patch color array
  const patchPixels = {
      rock: [1, 0.66, 0.33],
      rainWater: [1, 0.66, 0.63],
      floodWater: [0, 0.5, 1],
  }

  Object.assign(params, util.parseQueryString())
  console.log(params.test)
  const world = World.defaultWorld((Math.floor(params.worldSize/2) - 1))
  const model = new ErosionModelCtrl(world)

  //assign parameters after loading from url
  model.worldSize = params.worldSize
  model.initialWater = params.initialWater
  model.rainfall = params.rainfall
  model.edgeRunoff = params.edgeRunoff
  model.imageURL = 'https://s3-us-west-2.amazonaws.com/world-elevation-tiles/DEM_tiles/'.concat(params.modelZ, '/', params.modelX, '/', params.modelY, '.png')
  const steps = params.steps
  const colors = ColorMap.Basic16


  async function modelStart() {
    await model.startup()
    model.setup()
    console.log('startup done')
  }

  class ErosionView extends TwoView {
      initPatches() {
          this.createPatchPixels(i => Color.randomGrayPixel(0, 100))
      }
      draw() {
          if (controls.patchSize !== view.patchSize) {
              view.reset(controls.patchSize)
          }
          if (!this.draws) this.draws = 0
          if (this.draws === 0) this.initPatches()

          this.clear()
          //draw model based on patch type and elevation
          this.drawPatches(model.patches, p => Color.rgbaToPixel((p.graphElev*(patchPixels[p.type][0]) ),(p.graphElev*patchPixels[p.type][1]),(p.graphElev*patchPixels[p.type][2]))) // redraw patches colors
          this.draws++
      }
  }
  const view = new ErosionView('modelDiv', model.world, {
      useSprites: true,
      patchSize: controls.patchSize,
  })

  const anim = new Animator(model, view, controls.fps)
  modelStart().then(() => anim.start())
  util.toWindow({ template, controls, model, view, colors, anim })
