import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

type textProp = {
  text?: string;
};

const LoadingAnimation = ({ text = 'Thinking ...' }: textProp) => {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 text-center">
      <DotLottieReact
        className="mt-50 h-64 w-64 shrink-0"
        src="https://lottie.host/efb7b16d-8210-4ccc-9e8e-5c73482e3afb/2kZpJyNYHE.lottie"
        loop
        autoplay
      />
      <p className="font-sans text-sm font-medium text-muted-foreground">{text}</p>
    </div>
  );
};

export default LoadingAnimation;