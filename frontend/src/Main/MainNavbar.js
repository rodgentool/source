import { useState } from 'react';
import { Navbar, NavbarItem, DropdownMenu, DropdownItem } from '../Components/Navbar';


export const MainNavbar = ({
    isNavActive,
    onChangeIsNavActive,
    onChangeView,
    onChangeOpenProject,
    onChangeActivePopUp,
    grid,
    onChangeGrid,
    gridTick,
    onChangeGridTick,
    showRoadColors,
    onChangeRoadColors,
    showOnlyIntersectionNodes,
    onChangeShowOnlyIntersectionNodes,
    zoomIn,
    zoomOut,
    contextMenu,
    onChangeContextMenu,
    handleAlgorithm,

    }) => {
    const [navActive, setNavActive] = useState(null);


    const handleChangeView = () => {
        onChangeView('newProject');
    }

    // Manage Files 

    const handleSave = () => {
        onChangeActivePopUp('save');
    }

    const handleExport = () => {
        onChangeActivePopUp('export');
    }

    const handleOpen = (e) => {
        onChangeOpenProject(e);
        setNavActive(null);
    }

    const handleGridTick = (e) => {
        e.stopPropagation();
        if(e.key === undefined || (e.key === "Enter" || e.key === "ArrowUp" || e.key === "ArrowDown" )){
            onChangeGridTick(parseInt(e.target.value));
        }
    }

    const handleShowRoadColors = () => {
        onChangeRoadColors(!showRoadColors);
    }

    const handleShowOnlyIntersectionsNodes = () => {
        onChangeShowOnlyIntersectionNodes(!showOnlyIntersectionNodes);
    }

    return (
        <Navbar active={isNavActive} onChangeIsNavActive={onChangeIsNavActive} contextMenu={contextMenu} onChangeContextMenu={onChangeContextMenu}>
                    <NavbarItem name="File" navActive={navActive} onChangeNavActive={setNavActive}>
                        <DropdownMenu>
                            <DropdownItem onClick={handleChangeView}>New </DropdownItem>
                            <tr className="menu-item noselect" onClick={(e) => e.stopPropagation()}>
                            <td className='inputFile'>
                                <label className='inputFile'>Open ...
                                    <input className='hidden' type='file'  onClick={(e) => {e.target.value = null}} onChange={handleOpen}/>
                                </label></td>
                            </tr>
                            <tr>
                                <td><hr /></td>
                            </tr>
                            <DropdownItem onClick={handleSave}>Save ...</DropdownItem>
                            <DropdownItem onClick={handleExport}>Export ...</DropdownItem>
                        </DropdownMenu>
                    </NavbarItem>
                    <NavbarItem name="View" navActive={navActive} onChangeNavActive={setNavActive}>
                        <DropdownMenu>
                            <DropdownItem onClick={onChangeGrid} active={grid}>
                                Show Grid &nbsp;
                                {grid? 
                                    <label>
                                        <input className="input-number-nav"  type='number' min="100" step="10" defaultValue={gridTick} onClick={handleGridTick} onKeyUp={handleGridTick}></input>
                                        <span>&nbsp;&nbsp;m</span> 
                                    </label> 
                                    : null
                                    }
                            </DropdownItem>
                            <DropdownItem onClick={handleShowRoadColors} active={showRoadColors}>Show Road Colors</DropdownItem>
                            <DropdownItem onClick={handleShowOnlyIntersectionsNodes} active={showOnlyIntersectionNodes}>Show Intersections Only&nbsp;&nbsp;</DropdownItem>
                            <DropdownItem onClick={zoomIn}>Zoom In</DropdownItem>
                            <DropdownItem onClick={zoomOut}>Zoom Out</DropdownItem>
                        </DropdownMenu>
                    </NavbarItem>
                    <NavbarItem name="Tools" navActive={navActive} onChangeNavActive={setNavActive}>
                        <DropdownMenu>
                            <tr><td>Algorithms<hr/></td></tr>
                            <DropdownItem onClick={() => handleAlgorithm("analysis")}>Network Analysis</DropdownItem>
                            <DropdownItem onClick={() => handleAlgorithm("FP")}>Find Path</DropdownItem>
                        </DropdownMenu>
                    </NavbarItem>
                </Navbar>
    );
}