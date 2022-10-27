// OK

/**
 * Start View
 * @param {function} onChangeView set the current window
 * @param {function} onChangeOpenProject load a previously saved project
 * @returns Start View component
 */
export const Welcome = ({onChangeView, onChangeOpenProject}) => {

    /**
     * Set the View for to initialize a project 
     */
    const handleCreateProject = () => {
        onChangeView('newProject');
    }

    /**
     * Call the function to load projects, and if successful, redirect to the main page
     * @param {object} e event triggered when selecting the file to upload
     */
    const handleOpenProject = (e) => {
        onChangeOpenProject(e.target).then(() => {
            onChangeView("main");
        });
    }

    return (
    <div className='wrapperBody'>
        <div className='containerRound'>
            <h2 className="mt-0 mb-10 mx-10 wellcome">&nbsp; Welcome RODGEN &nbsp;</h2>
            <div className="wrapperFlexColumn">
                <button className='btn mx-12 mb-4' type='button' onClick= {handleCreateProject}>Create a new Project</button>
                <label className="btn mx-12 mb-6">Open A Project
                <input className='hidden' type='file' id="files" onClick={(e) => {e.target.value = null}} onChange={handleOpenProject}/></label>
            </div>
        </div>
    </div>
    );
}
