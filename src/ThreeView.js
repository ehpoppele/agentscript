import util from './util.js'
import World from './World.js'
import SpriteSheet from './SpriteSheet.js'
import PatchesView from './PatchesView.js'
import ThreeMeshes from './ThreeMeshes.js'

import { THREE, OrbitControls } from '../dist/vendor.esm.js'

// util.toWindow({ THREE, OrbitControls })

export default class ThreeView {
    static defaultOptions(useThreeHelpers = true) {
        const options = {
            orthoView: false, // 'Perspective', 'Orthographic'
            clearColor: 0x000000, // clear to black
            // clearColor: new THREE.Color(0x000000), // clear to black
            useAxes: useThreeHelpers, // show x,y,z axes
            useGrid: useThreeHelpers, // show x,y plane
            useControls: useThreeHelpers, // navigation. REMIND: control name?
            spriteSize: 64,
            patches: {
                meshClass: 'PatchesMesh',
            },
            turtles: {
                meshClass: 'QuadSpritesMesh',
            },
            links: {
                meshClass: 'LinksMesh',
            },
        }
        // util.forLoop(options, (val, key) => {
        //     if (val.meshClass) {
        //         const Mesh = ThreeMeshes[val.meshClass]
        //         const meshOptions = Mesh.options()
        //         val.options = meshOptions
        //     }
        // })

        return options
    }

    // -----------------------------------------------

    // div? or can?
    // https://threejs.org/docs/index.html#api/en/renderers/WebGLRenderer
    // worldOptions can be options or a world instance, both work.
    constructor(
        div = document.body,
        worldOptions = World.defaultOptions(),
        options = ThreeView.defaultOptions()
    ) {
        this.div = util.isString(div) ? document.getElementById(div) : div
        this.world = new World(worldOptions)
        this.renderOptions = options
        this.steps = 0

        if (this.renderOptions.spriteSize !== 0) {
            const isPOT = util.isPowerOf2(this.renderOptions.spriteSize)
            this.spriteSheet = new SpriteSheet(
                this.renderOptions.spriteSize,
                16,
                isPOT
            )
        }

        if (options.patches && options.patches.meshClass === 'PatchesMesh') {
            this.patchesView = new PatchesView(
                this.world.width,
                this.world.height
            )
        }

        this.initThree()
        this.initThreeHelpers()
        this.initMeshes()
    }
    // Init Three.js core: scene, camera, renderer
    initThree() {
        const { clientWidth, clientHeight } = this.div
        const { orthoView, clearColor } = this.renderOptions
        // const {width, height, centerX, centerY} = this.world
        // const { width, height } = this.world
        const [width, height] = this.world.getWorldSize()
        const [halfW, halfH] = [width / 2, height / 2]

        // this.spriteSheet.texture = new THREE.CanvasTexture(this.spriteSheet.ctx)
        // this.spriteSheet.setTexture(THREE.CanvasTexture)

        // REMIND: need world.minZ/maxZ
        const orthographicCam = new THREE.OrthographicCamera(
            // const orthographicCam = new OrthographicCamera(
            -halfW,
            halfW,
            halfH,
            -halfH,
            1,
            20 * width
        )
        orthographicCam.position.set(0, 0, 10 * width)
        orthographicCam.up.set(0, 0, 1)

        const perspectiveCam = new THREE.PerspectiveCamera(
            45,
            clientWidth / clientHeight,
            1,
            10000
        )
        // perspectiveCam.position.set(width + centerX, -width - centerY, width)
        perspectiveCam.position.set(width, -width, width)
        // perspectiveCam.lookAt(new THREE.Vector3(centerX, centerY, 0))
        perspectiveCam.up.set(0, 0, 1)

        const scene = new THREE.Scene()
        // scene.background = clearColor
        // scene.position = new THREE.Vector3(centerX, centerY, 0)
        const camera = orthoView ? orthographicCam : perspectiveCam

        // if (orthoView)
        //   camera.position.set(0, 0, 100 * width)
        // else
        //   camera.position.set(width, -width, width)
        // camera.up.set(0, 0, 1)

        // const renderer = new THREE.WebGLRenderer({ canvas: this.div })
        // const isCanvas = util.isCanvas(this.div)
        // const threeOpts = isCanvas ? { canvas: this.div } : {}
        // const renderer = new THREE.WebGLRenderer(threeOpts)
        const renderer = new THREE.WebGLRenderer()
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(clientWidth, clientHeight)
        renderer.setClearColor(clearColor)
        // if (!isCanvas) this.div.appendChild(renderer.domElement)
        this.div.appendChild(renderer.domElement)

        // window.addEventListener('resize', () => {
        //   const {clientWidth, clientHeight} = this.model.div
        //   camera.aspect = clientWidth / clientHeight
        //   camera.updateProjectionMatrix()
        //   renderer.setSize(clientWidth, clientHeight)
        // })
        window.addEventListener('resize', () => {
            this.resize()
        })

        Object.assign(this, {
            scene,
            camera,
            renderer,
            orthographicCam,
            perspectiveCam,
        })
    }
    resize() {
        const { clientWidth, clientHeight } = this.div
        const [width, height] = this.world.getWorldSize() // w/o "patchSize"

        if (this.renderOptions.orthoView) {
            const zoom = Math.min(clientWidth / width, clientHeight / height)
            this.renderer.setSize(zoom * width, zoom * height)
        } else {
            this.camera.aspect = clientWidth / clientHeight
            this.camera.updateProjectionMatrix()
            this.renderer.setSize(clientWidth, clientHeight)
        }
    }
    toggleCamera() {
        this.renderOptions.orthoView = !this.renderOptions.orthoView
        if (this.renderOptions.orthoView) {
            this.camera = this.orthographicCam
        } else {
            this.camera = this.perspectiveCam
        }
        this.resize()
        this.renderer.render(this.scene, this.camera)
    }
    // Return a dataURL for the current model step.
    snapshot(useOrtho = true) {
        // Don't set camera, can change w/ toggle below
        const { scene, renderer, model } = this
        const toggle = useOrtho && this.camera === this.perspectiveCam

        if (toggle) {
            this.toggleCamera()
            // model.draw(true) REMIND, need a draw proc
        }
        renderer.render(scene, this.camera)
        const durl = renderer.domElement.toDataURL()
        if (toggle) this.toggleCamera()
        return durl
    }
    initThreeHelpers() {
        const { scene, renderer, camera } = this
        // const {useAxes, useGrid, useControls, useStats, useGUI} = this
        const { useAxes, useGrid, useControls } = this.renderOptions
        const { width } = this.world
        const helpers = {}

        if (useAxes) {
            helpers.axes = new THREE.AxesHelper((1.5 * width) / 2)
            scene.add(helpers.axes)
        }
        if (useGrid) {
            helpers.grid = new THREE.GridHelper(1.25 * width, 10)
            helpers.grid.rotation.x = THREE.Math.degToRad(90)
            scene.add(helpers.grid)
        }
        if (useControls) {
            // helpers.controls = new THREE.OrbitControls(
            helpers.controls = new OrbitControls(camera, renderer.domElement)
        }

        Object.assign(this, helpers)
    }

    initMeshes() {
        this.meshes = {}
        util.forLoop(this.renderOptions, (val, key) => {
            if (val.meshClass) {
                const Mesh = ThreeMeshes[val.meshClass]
                const options = Mesh.options() // default options
                // override by user's
                if (val.options) Object.assign(options, val.options)
                const mesh = new ThreeMeshes[val.meshClass](this, options)
                this.meshes[key] = mesh
                mesh.init() // can be called again by modeler
            }
        })
    }
    // Call this right after ctor. Or add options to default params
    setPatchesSmoothing(smooth = false) {
        const filter = smooth ? THREE.LinearFilter : THREE.NearestFilter
        this.meshes.patches.mesh.material.map.magFilter = filter
    }

    idle(ms = 32) {
        util.timeoutLoop(() => view.draw(), -1, ms)
    }
    draw() {
        // REMIND: generalize.
        this.renderer.render(this.scene, this.camera)
        this.steps++
        // if (this.view.stats) this.view.stats.update()
    }

    getSprite(shape, fillColor, strokeColor = null) {
        return this.spriteSheet.getSprite(shape, fillColor, strokeColor)
    }

    // Sugar if viewFcn is a constant obj, convert to fcn.
    checkViewFcn(viewFcn) {
        return util.isObject(viewFcn) ? () => viewFcn : viewFcn
    }
    installDrawing(img) {
        this.meshes.patches.options.textureOptions = {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.LinearFilter,
        }
        this.meshes.patches.init(img)
    }
    createPatchPixels(pixelFcn) {
        this.patchesView.createPixels(pixelFcn)
        const data = this.patchesView.pixels
        this.meshes.patches.update(data, d => d, this.steps)
    }
    drawPatches(data, viewFcn) {
        // REMIND: may not be needed, patchesView does this check too.
        if (util.isOofA(data)) data = util.toAofO(data)
        this.meshes.patches.update(data, viewFcn, this.steps)
    }
    drawTurtles(data, viewFcn) {
        if (util.isOofA(data)) data = util.toAofO(data)
        viewFcn = this.checkViewFcn(viewFcn)
        this.meshes.turtles.update(data, viewFcn, this.steps)
    }
    drawLinks(data, viewFcn) {
        if (util.isOofA(data)) data = util.toAofO(data)
        viewFcn = this.checkViewFcn(viewFcn)
        this.meshes.links.update(data, viewFcn, this.steps)
    }
}

// export default ThreeView

/*

- patches smoothing: set textureOptions to linear for mag filter

*/
