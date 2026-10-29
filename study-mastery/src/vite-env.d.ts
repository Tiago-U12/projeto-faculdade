/// <reference types="vite/client" />
declare const __APP_VERSION__: string;
declare module 'virtual:sm-react-runtime' {
  /** React + ReactDOM (produção) como script clássico, em texto, para o sandbox do React Lab */
  const code: string;
  export default code;
}
