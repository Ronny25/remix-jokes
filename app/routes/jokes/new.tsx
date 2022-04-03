import type {ActionFunction, LoaderFunction} from '@remix-run/node';
import {json, redirect} from '@remix-run/node';
import {Form, Link, useActionData, useCatch, useTransition} from '@remix-run/react';

import {JokeDisplay} from '~/components/joke';

import {db} from '~/utils/db.server';
import {getUserId, requireUserId} from '~/utils/session.server';

export const loader: LoaderFunction = async ({request}) => {
    const userId = await getUserId(request);

    if (!userId) {
        throw new Response('Unauthorized', {status: 401});
    }

    return json({});
};

function validateJokeName(name: string) {
    if (name.length < 3) {
        return 'That joke\'s name is too short';
    }
}

function validateJokeContent(content: string) {
    if (content.length < 10) {
        return 'That joke is too short';
    }
}

type FormFields = {
    name: string;
    content: string;
}

type FormErrorFields = {
    [Name in keyof FormFields]: FormFields[Name] | undefined;
}

type ActionsData = {
    formError?: string;
    fieldErrors?: FormErrorFields;
    fields?: FormFields
}

const badRequest = (data: ActionsData) => json(data, {status: 400});

export const action: ActionFunction = async ({request}) => {
    const userId = await requireUserId(request);
    const form = await request.formData();
    const name = form.get('name');
    const content = form.get('content');

    if (
        typeof name !== 'string'
        || typeof content !== 'string'
    ) {
        return badRequest({
            formError: 'Form not submitted correctly.'
        });
    }

    const fieldErrors = {
        name: validateJokeName(name),
        content: validateJokeContent(content)
    };

    const fields = {name, content};

    if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest({fieldErrors, fields});
    }

    const joke = await db.joke.create({data: {...fields, jokesterId: userId}});
    return redirect(`/jokes/${joke.id}`);
};


export default function NewJokeRoute() {
    const transition = useTransition();
    const actionData = useActionData<ActionsData>();
    const {
        fieldErrors: {name: nameError, content: contentError} = {} as FormErrorFields,
        fields: {name: nameValue, content: contentValue} = {} as FormFields,
        formError
    } = actionData ?? {};

    if (transition.submission) {
        const name = transition.submission.formData.get('name');
        const content = transition.submission.formData.get('content');

        if (
            typeof name === 'string'
            && typeof content === 'string'
            && !validateJokeName(name)
            && !validateJokeContent(content)
        ) {
            return (
                <JokeDisplay joke={{name, content}} isOwner canDelete={false}/>
            );
        }
    }

    return (
        <div>
            <p>Add your own hilarious joke</p>
            <Form method="post">
                <div>
                    <label>
                        Name:{' '}
                        <input
                            defaultValue={nameValue}
                            type="text"
                            name="name"
                            aria-invalid={Boolean(nameError) || undefined}
                            aria-errormessage={nameError ? 'name-error' : undefined}
                        />
                    </label>
                    {nameError ? (
                        <p
                            className="form-validation-error"
                            role="alert"
                            id="name-error"
                        >
                            {nameError}
                        </p>
                    ) : null}
                </div>
                <div>
                    <label>
                        Content:{' '}
                        <textarea
                            name="content"
                            defaultValue={contentValue}
                            aria-invalid={Boolean(contentError) || undefined}
                            aria-errormessage={contentError ? 'content-error' : undefined}
                        />
                    </label>
                    {contentError ? (
                        <p
                            className="form-validation-error"
                            role="alert"
                            id="content-error"
                        >
                            {contentError}
                        </p>
                    ) : null}
                </div>
                <div>
                    {formError ? (
                        <p
                            className="form-validation-error"
                            role="alert"
                        >
                            {formError}
                        </p>
                    ) : null}
                    <button type="submit" className="button">
                        Add
                    </button>
                </div>
            </Form>
        </div>
    );
}

export function CatchBoundary() {
    const caught = useCatch();

    if (caught.status === 401) {
        return (
            <div className="error-container">
                <p>You must be logged in to create a joke.</p>
                <Link to="/login">Login</Link>
            </div>
        );
    }
}

export function ErrorBoundary() {
    return (
        <div className="error-container">
            Something unexpected went wrong. Sorry about that.
        </div>
    );
}
