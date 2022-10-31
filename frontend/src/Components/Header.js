import logo from '../imgs/Logo.png'; 
import gitHublogo from '../imgs/GitHub_Logo.png'; 

export const Header = () => {
return (
    <>
        <div className="header">
                <img src={logo} className='header_img h-80'/>
                <a href="https://github.com/rodgentool/source" target="_blank">
                    <img src={gitHublogo} className='header_img h-100'/>
                </a>

        </div>
        <hr className="header_line"/>
    </>  
);
} 