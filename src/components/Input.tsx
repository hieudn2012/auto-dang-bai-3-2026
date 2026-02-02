const Input = (props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>) => {
  return (
    <input type="text" className="w-full p-2 rounded-md border bg-transparent border-gray-300" {...props} />
  )
}

export default Input;
