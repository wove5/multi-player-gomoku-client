import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import style from './PageNotFound.module.css';

interface PageNotFoundProps {
  previousPath?: string;
  message: string;
}
export default function PageNotFound(props: PageNotFoundProps) {
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => {
      if (props.previousPath) {
        navigate(props.previousPath, { replace: true });
      } else {
        navigate(-1);
      }
    }, 1500);
  });
  return <div className={style.message}>{props.message}</div>;
}
