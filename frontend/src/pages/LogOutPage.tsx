import React, { Component } from 'react';
import { RouteComponentProps } from 'react-router'
import { API_LOG_OUT } from '../api';
import { resetApp } from '../store/application/actions'

import { connect } from 'react-redux'

const mapDispatchToProps = {
    resetApp: resetApp
}

interface PropsFromState { }
interface RouterProps extends RouteComponentProps<{
}> { }
interface PropsFromDispatch {
    resetApp: typeof resetApp
}
interface SelfProps { }
type Props = RouterProps & PropsFromState & PropsFromDispatch & SelfProps
class LogoutPage extends Component<Props> {
    componentDidMount() {
        API_LOG_OUT().then(resp => {
            if (resp.ok) {
                this.props.resetApp()
                this.props.history.push("/")
            }
        }
        )
    }

    render() {
        return <div/>
    }
}

export default connect(null, mapDispatchToProps)(LogoutPage)