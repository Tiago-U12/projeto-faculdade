import { handleFeedback, type Env } from '../../server/feedback';

export const onRequest = ({ request, env }: { request: Request; env: Env }): Promise<Response> => handleFeedback(request, env);
