/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import/prefer-default-export */
/* eslint-disable import/newline-after-import */

import { Header } from "./nav";
import { Sidebar } from "./sidebar";
export const Layout = ({ children,title,description,keywords,author }) => {
  return (
    <div>
<Header/>
<Sidebar/>


    </div>
  );
};
