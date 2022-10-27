import React from "react";

export const Navbar = ({children, active, onChangeIsNavActive, contextMenu, onChangeContextMenu}) => {
    
    const childrenWithProps = React.Children.map(children, 
        child => {
            if (React.isValidElement(child)) {
                return React.cloneElement(child, { active, onChangeIsNavActive, contextMenu, onChangeContextMenu});
            }
            return child;});


    return (
        <nav className="navbar">
            <ul className="navbar-nav" >{childrenWithProps}</ul>
        </nav>
    );
}


export const NavbarItem = ({name, children, navActive, onChangeNavActive,  active, onChangeIsNavActive, contextMenu, onChangeContextMenu}) => {

    const onMouseEnter = () => {
        onChangeNavActive(name);
    }


    const handleClick = (e) => {
        e.stopPropagation();
        if(contextMenu){
           onChangeContextMenu(false);
        }
        onChangeIsNavActive(!active)

    }

    return (
        <li className="navbar-item" onMouseEnter={onMouseEnter}>
            <div className="navbar-item" onClick={handleClick}>
                {name}
            </div>
            {active && navActive === name && children}
        </li>
    );
}


export const  DropdownMenu = ({children, position}) => {

    let style = {
        top: position? position.top : 45,
        left: position? position.left : 0,
        width: position? 110 : 210,
    }

    return(
        <div className="dropdown" style={style}>
            <table>
            <tbody>
                {children}
            </tbody>
            </table>
        </div>
    );
}


export const DropdownItem = ({children, onClick, active, className}) => {
    
    return(
        <tr className={"menu-item noselect" + className} onClick={onClick}>
            <td>{children}</td>
            <td>{active? <div>&#10003;</div> : null}   </td>
        </tr>    
    );
}

