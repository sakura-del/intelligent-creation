import mitt from 'mitt'

const emitter = mitt()

export const eventBus = {
  on: emitter.on,
  off: emitter.off,
  emit: emitter.emit,

  events: {
    AI_OPERATION_COMPLETED: 'ai:operation-completed',
    USER_DATA_UPDATED: 'user:data-updated',
    HISTORY_REFRESH_REQUIRED: 'history:refresh-required',
    STATISTICS_REFRESH_REQUIRED: 'statistics:refresh-required',
  },
}

export default eventBus
