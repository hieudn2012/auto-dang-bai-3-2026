# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list

- Lưu cấu trúc thư mục file config json
  {
    "wokring_dir": "/Users/admin/Desktop/Tien Ich",
  }

- Lưu lịch sử các profile đã mở file txt 
  - Mỗi profile sẽ có 1 dòng trong file txt
  - Mỗi dòng sẽ có cấu trúc `profile_id || folder`
  - Mỗi giá trị cách nhau bởi dấu `||`

- Các tính năng
  - Hiển thị danh sách profile
  - Random folder - chọn ngẫu nhiên 1 folder trong thư mục làm việc mà chưa có profile nào được mở
  - Đánh dấu folder đã mở
  - Mở profile
  - Post
  - Edit bài post - chèn link
  - Quote
  - Edit bài quote - chèn link
  


