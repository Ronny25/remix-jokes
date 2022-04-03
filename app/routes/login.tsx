import type {LinksFunction, MetaFunction} from '@remix-run/react/routeModules';
import type {ActionFunction} from '@remix-run/node';
import {useActionData, Link, useSearchParams, Form} from '@remix-run/react';
import {json} from '@remix-run/node';

import {db} from '~/utils/db.server';
import {createUserSession, login, register} from '~/utils/session.server';

import stylesUrl from '~/styles/login.css';

export const links: LinksFunction = () => [{rel: "stylesheet", href: stylesUrl}];

export const meta: MetaFunction = () => ({
    title: 'Remix Jokes | Login',
    description: 'Login to submit your own jokes to Remix Jokes!'
});

function validateUsername(username: unknown) {
    if (typeof username !== "string" || username.length < 3) {
        return `Usernames must be at least 3 characters long`;
    }
}

function validatePassword(password: unknown) {
    if (typeof password !== "string" || password.length < 6) {
        return `Passwords must be at least 6 characters long`;
    }
}

function validateUrl(url: any = '/jokes'): '/jokes' | '/' | 'https://remix.run' {
    console.log(url);

    let urls = ['/jokes', '/', 'https://remix.run'];
    if (urls.includes(url)) {
        return url;
    }

    return '/jokes';
}

type FormFields = {
    loginType: string;
    username: string;
    password: string;
}

type FormErrorFields = {
    [Name in keyof Omit<FormFields, 'loginType'>]: FormFields[Name] | undefined;
}

type ActionData = {
    formError?: string;
    fieldErrors?: FormErrorFields;
    fields?: FormFields;
};

const badRequest = (data: ActionData) => json(data, {status: 400});

export const action: ActionFunction = async ({request}) => {
    const form = await request.formData();
    const loginType = form.get('loginType');
    const username = form.get('username');
    const password = form.get('password');
    const redirectTo = validateUrl(form.get('redirectTo'));

    if (
        typeof loginType !== 'string' ||
        typeof username !== 'string' ||
        typeof password !== 'string'
    ) {
        return badRequest({formError: 'Form not submitted correctly.'});
    }

    const fields = {loginType, username, password};
    const fieldErrors = {
        username: validateUsername(username),
        password: validatePassword(password),
    };
    if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest({fieldErrors, fields});
    }

    switch (loginType) {
        case 'login': {
            const user = await login({username, password});

            if (!user) {
                return badRequest({
                    fields,
                    formError: 'Username/Password combination is incorrect.'
                });
            }

            return createUserSession(user.id, redirectTo);
        }

        case 'register': {
            const userExists = await db.user.findFirst({
                where: {username}
            });
            if (userExists) {
                return badRequest({
                    fields,
                    formError: `User with username ${username} already exists`
                });
            }

            const user = await register({username, password});
            if (!user) {
                return badRequest({
                    fields,
                    formError: 'Not implemented'
                });
            }

            return createUserSession(user.id, redirectTo);
        }

        default: {
            return badRequest({
                fields,
                formError: 'Login type invalid'
            });
        }
    }
};

export default function Login() {
    const [searchParams] = useSearchParams();
    const actionData = useActionData<ActionData>();

    const {
        fieldErrors: {username: usernameError, password: passwordError} = {} as FormErrorFields,
        fields: {username: usernameValue, password: passwordValue, loginType} = {} as FormFields,
        formError
    } = actionData ?? {};

    return (
        <div className="container">
            <div className="content" data-light="">
                <h1>Login</h1>
                <Form method="post">
                    <input
                        type="hidden"
                        name="redirectTo"
                        value={searchParams.get('redirectTo') ?? undefined}
                    />
                    <fieldset>
                        <legend className="sr-only">
                            Login or Register?
                        </legend>
                        <label>
                            <input
                                type="radio"
                                name="loginType"
                                value="login"
                                defaultChecked={!loginType || loginType === 'login'}
                            />{" "}
                            Login
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="loginType"
                                value="register"
                                defaultChecked={loginType === "register"}
                            />{" "}
                            Register
                        </label>
                    </fieldset>
                    <div>
                        <label htmlFor="username-input">Username</label>
                        <input
                            type="text"
                            id="username-input"
                            name="username"
                            defaultValue={usernameValue}
                            aria-invalid={Boolean(usernameError)}
                            aria-errormessage={usernameError ? "username-error" : undefined}
                        />
                        {usernameError ? (
                            <p
                                className="form-validation-error"
                                role="alert"
                                id="username-error"
                            >
                                {usernameError}
                            </p>
                        ) : null}
                    </div>
                    <div>
                        <label htmlFor="password-input">Password</label>
                        <input
                            id="password-input"
                            name="password"
                            defaultValue={passwordValue}
                            type="password"
                            aria-invalid={Boolean(passwordError) || undefined}
                            aria-errormessage={passwordError ? "password-error" : undefined}
                        />
                        {passwordError ? (
                            <p
                                className="form-validation-error"
                                role="alert"
                                id="password-error"
                            >
                                {passwordError}
                            </p>
                        ) : null}
                    </div>
                    <div id="form-error-message">
                        {formError ? (
                            <p
                                className="form-validation-error"
                                role="alert"
                            >
                                {formError}
                            </p>
                        ) : null}
                    </div>
                    <button type="submit" className="button">
                        Submit
                    </button>
                </Form>
            </div>
            <div className="links">
                <ul>
                    <li>
                        <Link to="/">Home</Link>
                    </li>
                    <li>
                        <Link to="/jokes">Jokes</Link>
                    </li>
                </ul>
            </div>
        </div>
    );
}
