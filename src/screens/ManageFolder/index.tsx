import Button from "@/components/Button";
import Input from "@/components/Input";
import Layout from "@/components/Layout";
import TextArea from "@/components/TextArea";
import { map, uniqBy } from "lodash";
import { useState } from "react";

// short name like abc...def
const shortName = (name: string) => {
  const maxLength = 10;
  if (name.length <= maxLength) {
    return name;
  }
  return `${name.substring(0, maxLength / 2)}...${name.substring(name.length - maxLength / 2)}`;
}



const ManageFolder = () => {
  const [workingFolder, setWorkingFolder] = useState('');
  const [productFolder, setProductFolder] = useState('');
  const [productSelected, setProductSelected] = useState('');
  const [message, setMessage] = useState('');

  const [products, setProducts] = useState<{ cap: string, link: string, name: string }[]>([]);

  const handleOpenDialogFolder = async () => {
    const folderPath = await window.api.openDialogFolder();
    setWorkingFolder(folderPath);
  }

  const handleCreateProductFolder = async () => {
    await window.api.createProductFolder(workingFolder, productFolder);
  }

  const handleLoadProductInfo = async () => {
    const productInfo = await window.api.loadProductInfo(`${workingFolder}/${productFolder}`);
    setProducts((currentProducts) => uniqBy([...currentProducts, { ...productInfo, name: productFolder }], 'name'));
  }

  const handleChangeProductInfo = (name: string, value: string) => {
    setProducts(products.map((product) => product.name === name ? { ...product, cap: value } : product));
  }

  const handleChangeLink = (name: string, value: string) => {
    setProducts(products.map((product) => product.name === name ? { ...product, link: value } : product));
  }

  const openFolder = (path: string) => {
    window.api.openFolder(path);
    setMessage('Đang mở thư mục')
  }

  const handleSaveProductInfo = ({ cap, link, path }: { cap: string, link: string, path: string }) => {
    window.api.saveProductInfo({ cap, link, path });
    setMessage('Đã lưu thông tin');
  }

  const handleMoveAllFilesFromFolderAtoFolderB = async () => {
    await window.api.moveAllFilesFromFolderAtoFolderB(`/Users/admin/Desktop/download`, `${workingFolder}/${productSelected}`);
    setMessage('Đã di chuyển tất cả file');
  }

  const handleSaveMainConfig = async () => {
    await window.api.saveMainConfig({ workingDir: workingFolder });
  }

  const handleLoadMainConfig = async () => {
    const config = await window.api.loadMainConfig();
    setWorkingFolder(config?.workingDir || '');
  }

  return (
    <Layout>
      <div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            <Input placeholder="Nhập tên thư mục làm việc" value={workingFolder} onChange={(e) => setWorkingFolder(e.target.value)} />
            <div className="flex gap-1">
              <Button onClick={handleOpenDialogFolder}>Chọn folder</Button>
              <Button onClick={handleLoadMainConfig}>Load folder làm việc</Button>
              <Button onClick={handleSaveMainConfig}>Lưu</Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Nhập tên thư mục sản phẩm" value={productFolder} onChange={(e) => setProductFolder(e.target.value)} />
            <div className="w-[300px]">
              <Button>Ramdom sản phẩm</Button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <Button onClick={handleCreateProductFolder}>Tạo sản phẩm</Button>
          <Button onClick={handleLoadProductInfo}>Load thông tin sản phẩm</Button>
        </div>
        <div className="font-bold mt-5">Danh sách sản phẩm</div>
        <div className="flex gap-1">
          {map(products, ({ name }) => (
            <Button key={name} onClick={() => setProductSelected(name)}>
              {shortName(name)}
            </Button>
          ))}
        </div>
        <div className="mt-5">
          {map(products.filter((product) => product.name === productSelected), ({ cap, link, name }) => (
            <div key={name} className="flex flex-col gap-2">
              <div className="font-bold">
                {name}
              </div>
              <div className="h-[500px]">
                <TextArea value={cap} onChange={(e) => handleChangeProductInfo(name, e.target.value)} />
              </div>
              <div>
                <TextArea value={link} onChange={(e) => handleChangeLink(name, e.target.value)} />
              </div>
              <div className="flex justify-between">
                <div className="flex gap-1">
                  <Button onClick={() => openFolder(`${workingFolder}/${name}`)}>Mở thư mục</Button>
                  <Button onClick={handleMoveAllFilesFromFolderAtoFolderB}>Lấy media file</Button>
                  <Button onClick={() => handleSaveProductInfo({ path: `${workingFolder}/${name}`, cap, link })}>Lưu thông tin</Button>
                  <Button>Đánh dấu đã đăng</Button>
                </div>
                <div className="font-bold text-green-600">{message}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}

export default ManageFolder;
