const Button = (props: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>) => {
  return (
    <button className="px-4 py-2 rounded-md bg-primary text-white font-bold" {...props}>
      {props.children}
    </button>
  )
}

export default Button;
