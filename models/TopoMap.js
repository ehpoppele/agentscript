
export function getImageData(img, offsetx, offsety, newwidth, newheight) {
  var ctx = getContext2d(img, offsetx, offsety, newwidth, newheight)
  var imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
  return imgData
}

export function getContext2d (img, offsetx, offsety, newwidth, newheight) {
  var w = newwidth || img.width
  var h = newheight || img.height
  var can = new OffscreenCanvas(w, h, { alpha: false })
  var ctx = can.getContext('2d')
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return ctx
}

export function extractRGBArray(imageData, addition, multiplier, worldSize) {
  addition = addition || 0
  multiplier = multiplier || 1
  var imgdat = imageData
  var numbArray = new Array(worldSize * worldSize)
  var dat = imgdat.data
  for (var i = 0; i < dat.length; i += 4) {
    var rgb = [dat[i], dat[i + 1], dat[i + 2]]
    var numb = rgb2Number(rgb) * multiplier + addition
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

export function rgb2Number(rgb) {
  var n = rgb[0] * 256 * 256 + rgb[1] * 256 + rgb[2]
  return n
}
