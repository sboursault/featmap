
import React, { Component, Dispatch } from 'react';
import { RouteComponentProps, } from 'react-router'
import { AppState, AllActions } from '../store'
import { application, getWorkspaceByName, getMembership, getSubscription } from '../store/application/selectors';
import { connect } from 'react-redux'
import { IApplication, IMembership, } from '../store/application/types';
import { newMessage } from '../store/application/actions';
import { Roles, mustCreateNewSub, isEditor, SubscriptionLevels } from '../core/misc';
import { receiveApp } from '../store/application/actions';
import { CardLayout, Button } from '../components/elements';
import { Formik, FormikActions, FormikProps, Form, Field } from 'formik';
import * as Yup from 'yup';
import { API_GET_MEMBERS, API_GET_CHECKOUT_SESSION, API_CHANGE_SUBSCRIPTION } from '../api';

const mapStateToProps = (state: AppState) => ({
    application: application(state),
})

const mapDispatchToProps = (dispatch: Dispatch<AllActions>) => ({
    newMessage: newMessage(dispatch),
    receiveApp: receiveApp
})

interface PropsFromState {
    application: IApplication
}
interface RouterProps extends RouteComponentProps<{
    workspaceName: string
}> { }
interface PropsFromDispatch {
    newMessage: ReturnType<typeof newMessage>
    receiveApp: typeof receiveApp
}
interface SelfProps { }
type Props = RouterProps & PropsFromState & PropsFromDispatch & SelfProps

interface State {
    members: IMembership[]
    loading: boolean
}

class SubscriptionPage extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            members: [],
            loading: true
        }
    }


    loadMembers() {
        const ws = getWorkspaceByName(this.props.application, this.props.match.params.workspaceName)!

        API_GET_MEMBERS(ws.id)
            .then(response => {
                if (response.ok) {
                    response.json().then((data: IMembership[]) => {
                        this.setState({ members: data })
                        this.setState({ loading: false })
                    })
                }
            })
    }


    nbrOfEditors() {
        return this.state.members.filter(x => isEditor(x.level)).length
    }


    defaultAction(): "basic" | "pro" {
        const ws = getWorkspaceByName(this.props.application, this.props.match.params.workspaceName)!
        const s = getSubscription(this.props.application, ws.id)

        if (s.level === SubscriptionLevels.BASIC) {
            return "basic"
        } else {
            return "pro"
        }
    }

    componentDidMount() {
        this.loadMembers()
    }

    render() {
        const ws = getWorkspaceByName(this.props.application, this.props.match.params.workspaceName)!
        const m = getMembership(this.props.application, ws.id)
        const s = getSubscription(this.props.application, ws.id)
        const ns = mustCreateNewSub(s)



        interface subscriptionForm {
            action: "basic" | "pro" | "cancel"
            nbrOfEditorsOnBasic: number
            nbrOfEditorsOnPro: number
        }

        return (
            <div>
                {this.state.loading ?
                    <div className="p-2"> Loading... </div>
                    :

                    <div>
                        {m.level !== Roles.OWNER ?
                            <div className="p-2">Only an owner of the workspace can change the workspace subscription. Please contact an owner. </div>
                            :
                            <div>

                                <div className="p-2">
                                    <h3>{ns ? "Sign up for a paid subscription" : "Change subscription"}</h3>
                                    <div className="flex flex-col">
                                        <Formik
                                            initialValues={{ action: this.defaultAction(), nbrOfEditorsOnBasic: ns ? this.nbrOfEditors() : s.numberOfEditors, nbrOfEditorsOnPro: ns ? this.nbrOfEditors() : s.numberOfEditors }}

                                            validationSchema={Yup.object().shape({
                                                action: Yup.string()
                                                    .required('Required.'),
                                                nbrOfEditorsOnBasic: Yup.number()
                                                    .min(1, "At least one editor is required")
                                                    .max(100, "If more than 100 editors, please contact sales@featmap.com"),
                                                nbrOfEditorsOnPro: Yup.number()
                                                    .min(1, "At least one editor is required")
                                                    .max(100, "If more than 100 editors, please contact sales@featmap.com")
                                            })}

                                            onSubmit={(values: subscriptionForm, actions: FormikActions<subscriptionForm>) => {

                                                const quantity = values.action === "basic" ? values.nbrOfEditorsOnBasic : values.nbrOfEditorsOnPro


                                                if (values.action === "basic" && values.nbrOfEditorsOnBasic < this.nbrOfEditors()) {
                                                    actions.setFieldError("nbrOfEditorsOnBasic", "Need to have at least " + this.nbrOfEditors() + " editors.")
                                                    actions.setSubmitting(false);
                                                    return
                                                }

                                                if (values.action === "pro" && values.nbrOfEditorsOnPro < this.nbrOfEditors()) {
                                                    actions.setFieldError("nbrOfEditorsOnPro", "Need to have at least " + this.nbrOfEditors() + " editors.")
                                                    actions.setSubmitting(false);
                                                    return
                                                }


                                                if (ns) {
                                                    API_GET_CHECKOUT_SESSION(ws.id, values.action, quantity)
                                                        .then(response => {
                                                            if (response.ok) {
                                                                response.json().then((session: string) => {

                                                                    let Stripe: any = (window as any).Stripe
                                                                    const stripe = Stripe(process.env.REACT_APP_STRIPE_PK)

                                                                    stripe.redirectToCheckout({
                                                                        sessionId: session,
                                                                    }).then((result: any) => {
                                                                        alert(result.error.message)
                                                                    });

                                                                })
                                                            } else {
                                                                this.props.history.push("/account/cancel")
                                                            }
                                                        }
                                                        )

                                                } else {
                                                    API_CHANGE_SUBSCRIPTION(ws.id, values.action, quantity)
                                                        .then(response => {
                                                            if (response.ok) {
                                                                this.props.history.push("/account/success")
                                                            } else {
                                                                this.props.history.push("/account/cancel")
                                                            }
                                                        }
                                                        )
                                                }

                                            }

                                            }

                                            render={(formikBag: FormikProps<subscriptionForm>) => (
                                                <Form>
                                                    {formikBag.status && formikBag.status.msg && <div>{formikBag.status.msg}</div>}

                                                    <div className="flex flex-col ">

                                                        <div className="flex flex-col m-1">
                                                            <Field
                                                                name="level "
                                                                component="div"
                                                            >
                                                                <div className="flex flex-row">
                                                                    <div className="flex align-middle  items-center p-2">
                                                                        <input
                                                                            type="radio"
                                                                            id="basic"
                                                                            defaultChecked={formikBag.values.action === "basic"}
                                                                            name="action"
                                                                            value="basic"
                                                                            className="w-5 h-5"
                                                                        />

                                                                    </div>
                                                                    <div className=" w-full">
                                                                        <CardLayout title={this.defaultAction() === "basic" && !ns ? "Basic (current plan)" : "Basic"}>
                                                                            <div >
                                                                                <ul className="list-reset ">
                                                                                    <li className="mb-2 flex items-center">
                                                                                        <div className="mr-1"><i className="material-icons font-bold text-green-500">done</i> </div>
                                                                                        <div>Unlimited projects </div>
                                                                                    </li>
                                                                                    <li className="mb-2 flex items-center">
                                                                                        <div className="mr-1"><i className="material-icons font-bold text-green-500">done</i> </div>
                                                                                        <div>Unlimited viewers </div>
                                                                                    </li>
                                                                                    <li className="mb-2 flex items-center">
                                                                                        <div className="mr-1"><i className="material-icons font-bold text-green-500">done</i> </div>
                                                                                        <div>Markdown editing </div>
                                                                                    </li>
                                                                                    <li className="mb-2 flex items-center">
                                                                                        <div className="mr-1"><i className="material-icons font-bold text-green-500">done</i> </div>
                                                                                        <div>Release management </div>
                                                                                    </li>
                                                                                </ul>

                                                                            </div>
                                                                            <div className=" ">
                                                                                <span className="text-2xl font-bold">$10</span> / month / editor
                                                                </div>
                                                                            <div className="mt-4">
                                                                                Number of editors <Field type="number" name="nbrOfEditorsOnBasic" className="ml-2 p-2 border w-16" /> (This workspace currently has {this.nbrOfEditors()} editors)
                                                                                    <span className="ml-2 text-red-500 text-xs font-bold">{formikBag.touched.nbrOfEditorsOnBasic && formikBag.errors.nbrOfEditorsOnBasic}</span>
                                                                            </div>
                                                                            <div className="mt-2">
                                                                                Total price is <span className="font-medium text-lg">${formikBag.errors.nbrOfEditorsOnBasic ? "0" : formikBag.values.nbrOfEditorsOnBasic * 10} </span> / month
                                                                </div>
                                                                        </CardLayout>
                                                                    </div>

                                                                </div>

                                                                <div className="flex flex-row">
                                                                    <div className="flex align-middle  items-center p-2">
                                                                        <input
                                                                            type="radio"
                                                                            id="pro"
                                                                            defaultChecked={formikBag.values.action === "pro"}
                                                                            name="action"
                                                                            value="pro"
                                                                            className="w-5 h-5"
                                                                        />

                                                                    </div>
                                                                    <div className=" w-full">
                                                                        <CardLayout title={this.defaultAction() === "pro" && !ns ? "Pro (current plan)" : "Pro"}>

                                                                            <div >
                                                                                <ul className="list-reset ">
                                                                                    <li className="mb-2 flex items-center">
                                                                                        <div>Includes everything in <b>Basic</b> and </div>
                                                                                    </li>
                                                                                    <li className="mb-2 flex items-center">
                                                                                        <div className="mr-1"><i className="material-icons font-bold text-green-500">done</i> </div>
                                                                                        <div>Share with external stakeholders, no account required </div>
                                                                                    </li>
                                                                                </ul>

                                                                            </div>
                                                                            <div className=" ">
                                                                                <span className="text-2xl font-bold">$15</span> / month / editor
                                                                </div>
                                                                            <div className="mt-4">
                                                                                Number of editors <Field type="number" name="nbrOfEditorsOnPro" className="ml-2 p-2 border w-16" />
                                                                                <span className="ml-2 text-red-500 text-xs font-bold">{formikBag.touched.nbrOfEditorsOnPro && formikBag.errors.nbrOfEditorsOnPro}</span> (This workspace currently has {this.nbrOfEditors()} editors)
                                                                                </div>
                                                                            <div className="mt-2">
                                                                                Total price is <span className="font-medium text-lg">${formikBag.errors.nbrOfEditorsOnPro ? "0" : formikBag.values.nbrOfEditorsOnPro * 15} </span> / month
                                                                </div>

                                                                        </CardLayout>
                                                                    </div>


                                                                </div>

                                                                {ns ?
                                                                    null
                                                                    :
                                                                    <div className="flex flex-row">
                                                                        <div className="flex align-middle  items-center p-2">
                                                                            <input
                                                                                type="radio"
                                                                                id="cancel"
                                                                                defaultChecked={false}
                                                                                name="action"
                                                                                value="cancel"
                                                                                className="w-5 h-5"
                                                                            />

                                                                        </div>
                                                                        <div className=" w-full">
                                                                            <CardLayout title="Cancel subscription">

                                                                                <p>Your current subscription will be
                                                                                <ul>
                                                                                    <li>canceled immediately and</li>
                                                                                    <li>remaining time will not be refunded.</li>
                                                                                </ul>
                                                                                </p>
                                                                                <p>
                                                                                It will still be possible to access existing projects, but it will not be possible to edit them.
                                                                                </p>

                                                                    </CardLayout>
                                                                        </div>


                                                                    </div>

                                                                }

                                                            </Field>
                                                        </div>
                                                        <div className=" m-1"><Button primary submit title={ns ? "Go to checkout" : "Change subscription"}/></div>
                                                    </div>
                                                </Form>
                                            )}
                                        />

                                    </div>

                                </div>

                            </div>
                        }

                    </div>

                }

            </div>
        )

    }
}


export default connect(mapStateToProps, mapDispatchToProps)(SubscriptionPage)
