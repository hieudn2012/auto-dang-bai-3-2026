type Props = React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  loading?: boolean;
}

const Button = ({ loading, ...props }: Props) => {
  return (
    <button className="px-2 py-1 rounded-md bg-primary text-white text-md font-semibold" {...props} disabled={loading}>
      {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : props.children}
    </button>
  )
}

export default Button;
