export default class CustomWebSocket extends WebSocket {
  pingTimeout?: ReturnType<typeof setTimeout>;
}
