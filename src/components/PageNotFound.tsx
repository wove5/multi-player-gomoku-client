import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import style from './PageNotFound.module.css';
import { GameContext } from '../context';

interface PageNotFoundProps {
  previousPath?: string;
  message: string;
}
export default function PageNotFound(props: PageNotFoundProps) {
  const { headerHeight} = useContext(GameContext);
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => {
      if (props.previousPath) {
        navigate(props.previousPath, { replace: true });
      } else {
        navigate(-1);
      }
    }, 3000);
  });
  return (
  <div 
    className={style.message}
    style={{ paddingTop: `${(headerHeight ?? 100) / 10 + 0.5}rem` }}
  >
    {props.message}
  </div>
  );
}
