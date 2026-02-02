const TextArea = (props: React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>) => {
  return (
    <textarea className="w-full p-2 rounded-md border bg-transparent border-gray-300" {...props} />
  )
}

export default TextArea;
