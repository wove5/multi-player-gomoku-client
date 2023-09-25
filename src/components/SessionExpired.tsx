import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SessionExpiredProps {
  styleName: string;
}

export default function PageNotFound(props: SessionExpiredProps) {
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => {
      navigate('/login');
    }, 1000);
  });
  return (
    <div className={props.styleName}>Session expired. Please log back in.</div>
  );
}
