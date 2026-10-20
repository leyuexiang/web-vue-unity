/**
 * 项目雪花编号的自定义纪元：2026-01-01 00:00:00 UTC。
 *
 * 采用标准 63 位布局：41 位毫秒时间戳、10 位工作节点、12 位序列号。
 * 生成结果必须以十进制字符串传递，避免 JavaScript Number 超过安全整数范围后丢失精度。
 */
const SNOWFLAKE_EPOCH = Date.UTC(2026, 0, 1)
const WORKER_ID_BITS = 10n
const SEQUENCE_BITS = 12n
const MAX_WORKER_ID = Number((1n << WORKER_ID_BITS) - 1n)
const MAX_SEQUENCE = (1n << SEQUENCE_BITS) - 1n
const MAX_TIMESTAMP_OFFSET = (1n << 41n) - 1n
const WORKER_ID_SHIFT = SEQUENCE_BITS
const TIMESTAMP_SHIFT = WORKER_ID_BITS + SEQUENCE_BITS

export interface SnowflakeIdGeneratorOptions {
  /**
   * 当前生成器的工作节点编号，范围为 0～1023。
   * 多个长期并行部署实例应由宿主系统分配不同值；浏览器默认生成器会为当前运行实例随机分配。
   */
  workerId: number
  /** 仅用于测试或宿主时钟适配；业务代码默认使用 Date.now。 */
  now?: () => number
  /** 仅用于协议迁移或测试；业务代码统一使用项目纪元。 */
  epoch?: number
}

/**
 * 同步雪花编号生成器。
 *
 * 与通过自旋等待下一毫秒的传统实现不同，本实现会在时钟回拨或序列耗尽时推进内部逻辑时钟，
 * 确保拖拽批量创建对象不会阻塞浏览器主线程，同时仍保持编号严格递增且不重复。
 */
export class SnowflakeIdGenerator {
  private readonly workerId: bigint
  private readonly now: () => number
  private readonly epoch: number
  private lastTimestamp = -1
  private sequence = 0n

  constructor(options: SnowflakeIdGeneratorOptions) {
    if (!Number.isInteger(options.workerId) || options.workerId < 0 || options.workerId > MAX_WORKER_ID) {
      throw new RangeError(`雪花算法工作节点编号必须是 0～${MAX_WORKER_ID} 的整数`)
    }

    const epoch = options.epoch ?? SNOWFLAKE_EPOCH
    if (!Number.isSafeInteger(epoch) || epoch < 0) {
      throw new RangeError('雪花算法纪元必须是非负安全整数时间戳')
    }

    this.workerId = BigInt(options.workerId)
    this.now = options.now ?? Date.now
    this.epoch = epoch
  }

  /**
   * 生成一个十进制雪花编号字符串。
   *
   * @returns 不超过 63 位二进制范围的十进制字符串，可安全写入场景 JSON。
   */
  nextId(): string {
    const physicalTimestamp = Math.trunc(this.now())
    if (!Number.isSafeInteger(physicalTimestamp)) {
      throw new RangeError('雪花算法时钟必须返回安全整数毫秒时间戳')
    }

    let logicalTimestamp = Math.max(physicalTimestamp, this.lastTimestamp)
    if (logicalTimestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & MAX_SEQUENCE
      if (this.sequence === 0n) {
        /**
         * 单毫秒内超过 4096 个编号或物理时钟长时间回拨时，直接推进一毫秒逻辑时间。
         * 这比 while 循环等待 Date.now 变化更适合浏览器，不会占满主线程。
         */
        logicalTimestamp = this.lastTimestamp + 1
      }
    } else {
      this.sequence = 0n
    }

    const timestampOffset = BigInt(logicalTimestamp - this.epoch)
    if (timestampOffset < 0n || timestampOffset > MAX_TIMESTAMP_OFFSET) {
      throw new RangeError('当前时间超出雪花算法可表示范围')
    }

    this.lastTimestamp = logicalTimestamp
    return (
      (timestampOffset << TIMESTAMP_SHIFT) |
      (this.workerId << WORKER_ID_SHIFT) |
      this.sequence
    ).toString()
  }
}

/**
 * 为当前前端运行实例生成工作节点编号。
 *
 * 优先使用浏览器密码学随机源；测试环境或旧浏览器不支持时才退化为时间与随机数混合。
 * 节点编号只在模块初始化时生成一次，不进入对象创建热路径。
 */
const createRuntimeWorkerId = (): number => {
  const randomValues = new Uint16Array(1)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(randomValues)
    return randomValues[0] & MAX_WORKER_ID
  }

  return Math.floor((Date.now() + Math.random() * (MAX_WORKER_ID + 1)) % (MAX_WORKER_ID + 1))
}

/**
 * 二维、三维场景对象共享同一个生成器，避免两条创建链路分别维护序列而产生同毫秒碰撞。
 */
const sceneObjectIdGenerator = new SnowflakeIdGenerator({
  workerId: createRuntimeWorkerId(),
})

/**
 * 生成场景对象使用的雪花编号。
 *
 * @returns 十进制字符串形式的雪花编号。
 */
export const createSnowflakeId = (): string => sceneObjectIdGenerator.nextId()

