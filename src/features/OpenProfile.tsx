import Button from "@/components/Button"

interface Props {
  id: number;
}

const OpenProfile = ({ id }: Props) => {
  const handleOpen = () => {
    window.api.openProfile(id);
  }

  return (
    <Button onClick={handleOpen}>Open</Button>
  )
}

export default OpenProfile;