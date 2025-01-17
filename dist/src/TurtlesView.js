import util from './util.js'
import Shapes from './Shapes.js'

export default class TurtlesView {
    constructor(ctx, patchSize, world, useSprites = false) {
        Object.assign(this, { ctx, world, patchSize, useSprites })
        this.shapes = new Shapes()
        this.resetCtx(patchSize, useSprites)
    }
    reset(patchSize, useSprites) {
        this.useSprites = useSprites
        this.resetCtx(patchSize) // sets this.patchSize
    }

    getImageBitmap() {
        return createImageBitmap(this.ctx.canvas)
    }

    resetCtx(patchSize) {
        this.patchSize = patchSize
        if (this.useSprites) {
            // If using sprites, do not install the transform
            this.world.setCanvasSize(this.ctx.canvas, patchSize)
        } else {
            // If using shapes, create euclidean transform.
            this.world.setCtxTransform(this.ctx, patchSize)
        }
    }

    drawTurtles(data, viewFcn) {
        if (util.isOofA(data)) data = util.toAofO(data)
        const constantView = util.isObject(viewFcn)
        util.forLoop(data, (turtle, i) => {
            const viewData = constantView ? viewFcn : viewFcn(turtle, i, data)
            this.drawTurtle(turtle, viewData)
        })
    }
    drawTurtle(turtle, viewData) {
        if (this.useSprites) {
            let { sprite, noRotate } = viewData
            // If not the short form, create the image.
            // Not too bad, it uses the shapes.cache after first image.
            if (!sprite) {
                const { shape, color, strokeColor, size } = viewData
                const pixels = size * this.patchSize
                sprite = this.shapes.shapeToImage(
                    shape,
                    pixels,
                    color,
                    strokeColor
                )
            }

            if (sprite.sheet) {
                sprite.sheet.draw(
                    this.ctx,
                    sprite,
                    turtle.x,
                    turtle.y,
                    turtle.theta,
                    this.world,
                    this.patchSize,
                    noRotate
                )
            } else {
                this.drawImage(
                    sprite,
                    turtle.x,
                    turtle.y,
                    noRotate ? 0 : turtle.theta
                )
            }
        } else {
            const { shape, color, size, noRotate } = viewData
            this.drawShape(
                shape,
                turtle.x,
                turtle.y,
                noRotate ? 0 : turtle.theta,
                size,
                color
            )
        }
    }

    drawShape(name, x, y, theta = 0, size = 1, fill, stroke) {
        const ctx = this.ctx
        ctx.save()

        // note: neither may be needed! image needs none, no-stroke only fill.
        ctx.fillStyle = fill
        ctx.strokeStyle = stroke

        ctx.translate(x, y)
        ctx.scale(size, size)
        if (theta !== 0) ctx.rotate(theta)
        ctx.beginPath()
        this.shapes.paths[name](ctx)
        ctx.closePath()
        ctx.fill()

        ctx.restore()
    }

    drawImage(img, x, y, theta = 0) {
        const halfPix = img.width / 2
        const patchSize = this.patchSize //this.world.canvasPatchSize(ctx.canvas)
        const [x0, y0] = this.world.patchXYtoPixelXY(x, y, patchSize)
        const ctx = this.ctx

        if (theta === 0) {
            ctx.drawImage(img, x0 - halfPix, y0 - halfPix)
        } else {
            ctx.save()
            ctx.translate(x0, y0)
            ctx.rotate(-theta)
            ctx.drawImage(img, -halfPix, -halfPix)
            ctx.restore()
        }
    }

    drawLinks(data, viewFcn) {
        if (util.isOofA(data)) data = util.toAofO(data)
        const uniformLinks = util.isObject(viewFcn)
        const ctx = this.ctx
        util.setIdentity(this.ctx)
        if (uniformLinks) {
            ctx.strokeStyle = viewFcn.color
            ctx.lineWidth = viewFcn.width || 1
            ctx.beginPath()
        }
        util.forLoop(data, (link, i) => {
            if (uniformLinks) {
                this.drawLink(link)
            } else {
                const { color, width } = viewFcn(link, i, data)
                this.drawLink(link, color, width)
            }
        })
        if (uniformLinks) {
            ctx.closePath()
            ctx.stroke()
        }
        this.ctx.restore() // set identity does a save()
    }

    drawLink(link, color, width = 1) {
        this.drawLine(link.x0, link.y0, link.x1, link.y1, color, width)
    }

    drawLine(x0, y0, x1, y1, stroke, width = 1) {
        // ctx.save() // set identity does a save()
        const ctx = this.ctx
        ;[x0, y0] = this.world.patchXYtoPixelXY(x0, y0, this.patchSize)
        ;[x1, y1] = this.world.patchXYtoPixelXY(x1, y1, this.patchSize)

        if (stroke) {
            ctx.strokeStyle = stroke
            ctx.lineWidth = width
            ctx.beginPath()
        }
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
        // util.setIdentity(ctx)
        if (stroke) {
            ctx.closePath()
            ctx.stroke()
        }
        // ctx.restore()
    }
}

/*

ToDo:
    - hello: *faster* w/o sprites! (uniform links)
        http://localhost/src/agentscript/tests/hello.html 144
        http://localhost/src/agentscript/tests/hello.html?sprites 95
      Possibly the sprite name lookup is slow? w/ non-uniform links:
        http://localhost/src/agentscript/tests/hello.html?links 70
        http://localhost/src/agentscript/tests/hello.html?links&sprites 83
      !! now faster w/ sprites.
      Gotta be a bug of some sort
    - hello: noTurtles: uniform links: 1068, non: 205! fast!
    - hello: noLinks: 149, sprites: 118! What's up? Darts faster than imgs?

    - ctor: change params,
    - The OofA needs parameters/template, not just x,y,theta

*/
