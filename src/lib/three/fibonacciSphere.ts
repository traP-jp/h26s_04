import { Vector3 } from 'three'

function fibonacciSphere(n: number): Vector3[] {
  const points: Vector3[] = []
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)) // 黄金角（ラジアン）

  for (let i = 0; i < n; i++) {
    // y を 1 から -1 まで、n個に均等分割して下げていく
    const y = 1 - (i / (n - 1)) * 2
    // その高さ(y)での「緯線」の半径
    const radiusAtY = Math.sqrt(1 - y * y)
    // 角度を黄金角ずつ進める
    const theta = goldenAngle * i

    const x = Math.cos(theta) * radiusAtY
    const z = Math.sin(theta) * radiusAtY

    points.push(new Vector3(x, y, z))
  }

  return points
}