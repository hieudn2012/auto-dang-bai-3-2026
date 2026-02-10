const Button = (props: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>) => {
  return (
    <button className="px-4 py-1 rounded-md bg-primary text-white text-md font-semibold" {...props}>
      {props.children}
    </button>
  )
}

export default Button;
