export const Section = ({name, children}) => {
    return(
        <>
        <div className="section-title">{name}</div>
        <div className="section-info">{children}</div>
        </>
    );
}
