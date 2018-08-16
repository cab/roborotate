/* globals, yum */
const LEFT = 0
const RIGHT = 1
const SPEED = 3
const inputStream = []
const keyStatus = {}

const ms = () => +new Date()

function tick(fps, callback) {
  let lastTick = ms()
  const minFrame = 1000 / fps
  function run() {
    const now = ms()
    const diff = now - lastTick
    if (diff >= minFrame) {
      lastTick = now
      callback(diff)
    }
    window.requestAnimationFrame(run)
  }
  window.requestAnimationFrame(run)
}

function start({ context, width, height }) {
  const robot = mkRobot({ areaWidth: width, areaHeight: height })
  tick(60, delta => {
    context.clearRect(0, 0, width, height)
    context.fillStyle = "#000000"
    context.fillRect(0, 0, width, height)
    const inputs = readInputs()
    inputs.forEach(input => {
      switch (input.event) {
        case "AddThrustLeft":
          {
            robot.leftInput += input.value
          }
          break
        case "AddThrustRight":
          {
            robot.rightInput += input.value
          }
          break
      }
    })
    updateRobot(robot, delta / 1000)
    drawRobot(context, robot)
  })
}

function crossProduct(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ]
}

function dotproduct(a, b) {
  let n = 0
  let lim = Math.min(a.length, b.length)
  for (let i = 0; i < lim; i++) {
    n += a[i] * b[i]
  }
  return n
}

function updateRobot(robot, delta) {
  adjustInputs(robot)
  applyFriction(robot, delta)
  applyForce(robot, delta)
}

function applyFriction(robot, delta) {
  robot.dx *= 0.99
  robot.dy *= 0.99
  robot.dr *= 0.99
}

function applyForce(robot, delta) {
  const leftForce = calculateSideForce(LEFT, robot)
  const rightForce = calculateSideForce(RIGHT, robot)
  const total = {
    dr: leftForce.dr - rightForce.dr,
    dx: leftForce.dx + rightForce.dx,
    dy: leftForce.dy + rightForce.dy
  }
  // robot.dr += total.dr
  // robot.dy += total.dy
  // robot.dx += total.dx
  robot.rotation += total.dr * delta
  robot.y += total.dy * delta
  robot.x += total.dx * delta
}

function calculateSideForce(side, robot) {
  const { rotation, height, width } = robot
  const thrusterX = side === LEFT ? -width : width
  const thrusterY = height / 2
  const thrusterXRotated =
    -(thrusterY * Math.sin(rotation)) + thrusterX * Math.cos(rotation)
  const thrusterYRotated =
    thrusterY * Math.cos(rotation) + thrusterX * Math.sin(rotation)
  const directionAngle = Math.atan2(thrusterYRotated, thrusterXRotated)
  const magnitude = (side === LEFT ? robot.leftInput : robot.rightInput) * SPEED
  const pheta = directionAngle - rotation
  const fr = Math.sin(pheta) * magnitude
  const fv = Math.cos(pheta) * magnitude
  return {
    dr: fr,
    // multiply again so it's more fun
    dx: -Math.sin(directionAngle) * fv * 10,
    dy: Math.cos(directionAngle) * fv * 10
  }
}

function adjustInputs(robot) {
  robot.leftInput = clamp(-1, 1, robot.leftInput)
  robot.rightInput = clamp(-1, 1, robot.rightInput)
  robot.dr = clamp(-Math.PI * 2, Math.PI * 2, robot.dr)
}

function clamp(min, max, value) {
  if (value <= min) {
    return min
  } else if (value >= max) {
    return max
  } else {
    return value
  }
}

function readKeys() {
  const inputs = inputStream.slice()
  inputStream.length = 0
  return inputs.filter(e => e instanceof KeyboardEvent).forEach(event => {
    switch (event.type) {
      case "keydown":
        keyStatus[event.key] = true
        break
      case "keyup":
        keyStatus[event.key] = false
        break
    }
  })
}

function readInputs() {
  readKeys()
  const change = 0.05
  const leftForward = keyStatus["x"]
    ? [{ event: "AddThrustLeft", value: -change }]
    : []
  const leftBackward = keyStatus["z"]
    ? [{ event: "AddThrustLeft", value: change }]
    : []
  const rightForward = keyStatus["m"]
    ? [{ event: "AddThrustRight", value: -change }]
    : []
  const rightBackward = keyStatus["n"]
    ? [{ event: "AddThrustRight", value: change }]
    : []
  return [...leftForward, ...leftBackward, ...rightForward, ...rightBackward]
}

function mkRobot({ areaWidth, areaHeight }) {
  const width = 32
  const height = 32
  return {
    x: areaWidth / 2 - width / 2,
    y: areaHeight / 2 - height / 2,
    width,
    height,
    rotation: 0,
    leftInput: 0,
    rightInput: 0,
    dx: 0,
    dy: 0,
    dr: 0
  }
}

function drawRobot(context, robot) {
  context.save()
  context.translate(robot.x + robot.width / 2, robot.y + robot.height / 2)
  context.rotate(robot.rotation)
  context.fillStyle = "#ffb6c1"
  context.fillRect(
    -robot.width / 2,
    -robot.height / 2,
    robot.width,
    robot.height
  )
  drawThruster(context, LEFT, robot)
  drawThruster(context, RIGHT, robot)
  context.restore()
}

function drawThruster(context, side, robot) {
  const width = robot.width / 4
  const value = side === LEFT ? robot.leftInput : robot.rightInput
  const height = (value * robot.height) / 2
  const x = side === LEFT ? -robot.width / 2 - width : robot.width / 2
  context.fillStyle = "#ffffff"
  context.fillRect(x, 0, width, height)
}

function mkCanvas() {
  const container = document.getElementById("game")
  const { clientHeight: height, clientWidth: width } = container
  const element = document.createElement("canvas")
  element.setAttribute("width", `${width}px`)
  element.setAttribute("height", `${height}px`)
  element.setAttribute("tabindex", 1)
  const context = element.getContext("2d")
  element.addEventListener("keydown", event => {
    inputStream.push(event)
  })
  element.addEventListener("keyup", event => {
    inputStream.push(event)
  })
  container.appendChild(element)
  element.focus()
  return {
    element,
    width,
    height,
    context
  }
}

;(function() {
  const { context, width, height } = mkCanvas()
  start({ context, width, height })
})()
