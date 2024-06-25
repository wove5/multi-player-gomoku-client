import style from './Chat.module.css';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@mdi/react';
import { mdiMessageReplyText } from '@mdi/js';
import { PlayerDetail } from '../types';
import { GameContext, UserContext } from '../context';
import { CustomWebSocket } from '../classes';

// import { useWhatChanged } from '@simbathesailor/use-what-changed';

interface Message {
  message: string;
  userId: string;
  userName: string;
}

interface ChatProps {
  // ws: WebSocket;
  ws: CustomWebSocket;
  messages: Message[];
  updateMessages: (msg: Message) => void;
}

export default function Chat(props: ChatProps) {
  const { ws, messages, updateMessages } = props;

  const scrollBottomRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { user } = useContext(UserContext);
  const { players } = useContext(GameContext);

  const me: PlayerDetail | undefined = useMemo(
    () =>
      players
        ? players.find((p: PlayerDetail) => p.userId === user?._id)
        : undefined,
    [players, user?._id]
  );

  const [myMessage, setMyMessage] = useState<string>('');

  const [chatVisible, setChatVisible] = useState(true);

  const onSend = () => {
    if (me && myMessage && ws) {
      ws?.send(
        JSON.stringify({
          message: myMessage,
          userId: me.userId,
          userName: me.userName,
        })
      );
      updateMessages({
        message: myMessage,
        userId: me.userId,
        userName: me.userName,
      });
      setMyMessage('');
    }
    if (inputRef.current?.parentElement) {
      inputRef.current.parentElement.dataset.replicatedValue = '';
      inputRef.current.parentElement.style.height = 'auto';
    }
  };

  const toggleChatVisible = () => {
    setChatVisible(!chatVisible);
  };

  useEffect(() => {
    if (scrollBottomRef.current) {
      scrollBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  });

  function auto_height(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const { target } = event;
    if (target.parentElement) {
      target.parentElement.dataset.replicatedValue = target.value;
      target.parentElement.style.height = `${target.scrollHeight}px`;
    }
  }

  return (
    <>
      <div className={style.messages}>
        {messages.map((message, key) => (
          <div
            key={key}
            className={`${style.message} ${
              user?._id === message.userId
                ? style['flex-end']
                : style['flex-start']
            }`}
          >
            <section>{message.userName[0].toUpperCase()}</section>
            <h4>{message.userName + ':'}</h4>
            <p>{message.message}</p>
          </div>
        ))}
        <div ref={scrollBottomRef} />
      </div>

      <div className={style.bottom}>
        <div className={`${style.form}`}>
          <button
            className={`${style['chat-btn']} ${
              !chatVisible ? ' ' + style['chat-btn-fade'] : ''
            }`}
            onClick={toggleChatVisible}
          >
            <Icon path={mdiMessageReplyText} size={2} />
          </button>
          <div
            className={`${style['grow-wrap']} ${
              chatVisible ? ' ' + style.show : ''
            }`}
          >
            <textarea
              className={style.textarea}
              id={'textarea'}
              ref={inputRef}
              // type="myMessage"
              rows={1}
              value={myMessage}
              onChange={(e) => {
                setMyMessage(e.target.value);
              }}
              onKeyUp={(e) => {
                if (e.key === 'Enter') {
                  // onSend();
                  // buttonRef.current?.focus();
                  buttonRef.current?.click();
                  e.currentTarget.blur();
                  // buttonRef.current?.click();
                }
              }}
              onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                auto_height(e)
              }
              placeholder="Message"
            ></textarea>
          </div>
          <button
            className={`${style.button} ${chatVisible ? ' ' + style.show : ''}`}
            ref={buttonRef}
            onClick={onSend}
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}
