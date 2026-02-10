const TextArea = (props: React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>) => {
  return (
    <textarea className="w-full h-full p-2 rounded-md border bg-transparent border-gray-300 bg-white" {...props} />
  )
}

export default TextArea;
