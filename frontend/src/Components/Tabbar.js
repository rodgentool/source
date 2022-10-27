
export const Tabbar = ({children}) => 
{
    return (
        <div className="panel-tabs">
            {children}
        </div>
    );
}

export const Tab = ({title, onClick, active, id}) => 
{
    let classN;
    if(active) {
        classN = "panel-tab panel-tab-active";
    } else {
        classN = "panel-tab"
    }
    return (
        <div className={classN} onClick={onClick} id={id}>
            {title} 
        </div>
    );
}

export const TabContent = ({display, children, className}) => 
{
    return (
        <>
        {display? <div className={className}>{children}</div>: null}
        </>
       
    );
}