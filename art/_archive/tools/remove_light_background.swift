import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count == 3 else {
  fputs("usage: remove_light_background.swift input.png output.png\n", stderr)
  exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
guard
  let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
  let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
else {
  fputs("could not read input image\n", stderr)
  exit(1)
}

let width = image.width
let height = image.height
let bytesPerRow = width * 4
var pixels = [UInt8](repeating: 0, count: height * bytesPerRow)
let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let context = CGContext(
  data: &pixels,
  width: width,
  height: height,
  bitsPerComponent: 8,
  bytesPerRow: bytesPerRow,
  space: colorSpace,
  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
  fputs("could not create pixel buffer\n", stderr)
  exit(1)
}

context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

// The generated source uses a neutral near-white backdrop. Convert only neutral,
// bright pixels to alpha and retain a short feathered edge for clean game rendering.
for pixel in stride(from: 0, to: pixels.count, by: 4) {
  let red = Double(pixels[pixel])
  let green = Double(pixels[pixel + 1])
  let blue = Double(pixels[pixel + 2])
  let brightness = (red + green + blue) / 3.0
  let chroma = max(red, green, blue) - min(red, green, blue)
  guard brightness > 170, chroma < 30 else { continue }

  let brightnessAlpha = max(0, min(1, (190 - brightness) / 20))
  let chromaAlpha = max(0, min(1, (chroma - 8) / 18))
  let alpha = max(brightnessAlpha, chromaAlpha)
  pixels[pixel + 3] = UInt8(Double(pixels[pixel + 3]) * alpha)
}

guard let outputImage = context.makeImage() else {
  fputs("could not create output image\n", stderr)
  exit(1)
}

guard let destination = CGImageDestinationCreateWithURL(
  outputURL as CFURL,
  UTType.png.identifier as CFString,
  1,
  nil
) else {
  fputs("could not create output file\n", stderr)
  exit(1)
}

CGImageDestinationAddImage(destination, outputImage, nil)
guard CGImageDestinationFinalize(destination) else {
  fputs("could not write output image\n", stderr)
  exit(1)
}
