interface Props {
  children: React.ReactNode;
  loading: boolean;
}

const LoadingWraper = ({ children, loading }: Props) => {
  return (
    <div className="relative">
      {loading && (
        <div className="flex justify-center p-5">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}
      {!loading && children}
    </div>
  )
}

      export default LoadingWraper;