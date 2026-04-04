import { FC } from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>; 
export const Button: FC<ButtonProps> = ({ children, className, ...props }) => {
  return (
    <button
      className={`rounded-sm border border-zinc-800 bg-white shadow-none disabled:bg-zinc-100 hover:text-black py-2 px-3 active:text-black ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
};
