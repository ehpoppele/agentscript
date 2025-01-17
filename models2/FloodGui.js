//View and Run File for the flood model; Eli Poppele
//Based on other agentscript GUI files; adds controls,
//establishes params, creates and runs model and view
import World from '../src/World.js'
import Color from '../src/Color.js'
import ColorMap from '../src/ColorMap.js'
import Animator from '../src/Animator.js'
import GUI from '../src/GUI.js'
import TwoView from '../src/TwoView.js'
import FloodModel from '../models/FloodModel.js'
import util from '../src/util.js'
util.toWindow({ Color, ColorMap, Animator, GUI, TwoView, FloodModel, util })

//template/defaults for GUI
const template = {
    rainfallRate: { value: 10, extent: [0, 25, 1] },
    patchSize: { value: 12, extent: [1, 20, 1] },
    edgeRunoff: { value: true},
    dryUp: { value: false},
    run: { value: () => anim.toggle() },
}
const controls = new GUI(template).target

class FloodModelCtrl extends FloodModel {
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

  //define color for each patch type
  const patchPixels = {
      rock: [1, 0.66, 0.33],
      rainWater: [1, 0.66, 0.33],
      floodWater: [0, 0.5, 1],
  }

  Object.assign(params, util.parseQueryString())
  console.log(params.test)
  const world = World.defaultWorld((Math.floor(params.worldSize/2) - 1))
  const model = new FloodModelCtrl(world)

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

  class FloodView extends TwoView {
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
          //draw patches with color based on type and shade based on elevation
          this.drawPatches(model.patches, p => Color.rgbaToPixel((p.graphElev*(patchPixels[p.type][0]) ),(p.graphElev*patchPixels[p.type][1]),(p.graphElev*patchPixels[p.type][2]))) // redraw patches colors
          this.draws++
      }
  }
  const view = new FloodView('modelDiv', model.world, {
      useSprites: true,
      patchSize: controls.patchSize,
  })

  const anim = new Animator(model, view, controls.fps)
  modelStart().then(() => anim.start())
  util.toWindow({ template, controls, model, view, colors, anim })
