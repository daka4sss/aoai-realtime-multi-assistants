import { bingWebSearch } from "./search";
import { ItemCreateMessage, SessionUpdateMessage, ToolsDefinition } from "rt-client";

export class AssistantService {

    language: string = "English";

    private toolsForGenericAssistants = [
        {
            name: 'get_weather',
            description: 'get the weather of the locaion',
            parameters: {
                type: 'object',
                properties: {
                    location: { type: 'string', description: 'location for the weather' }
                }
            },
            returns: async (arg: string) => `the weather of ${JSON.parse(arg).location} is 40F and rainy`
        }, {
            name: 'Assistant_MobileAssistant',
            description: 'Help user to answer mobile related question, such as billing, contract, etc.',
            parameters: {
                type: 'object',
                properties: {}
            },
            returns: async (arg: string) => "Assistant_MobileAssistant"
        }, {
            name: 'Assistant_ShopAssistant',
            description: 'Help user to answer shop related question, such as shop location, available time, etc.',
            parameters: {
                type: 'object',
                properties: {}
            },
            returns: async (arg: string) => "Assistant_ShopAssistant"
        }, {
            name: 'search_generic_information',
            description: 'Use this function when you need to search the generic inforamtion. Do not tell customer the fake billing information before getting result from this function.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'query' }
                }
            },
            returns: async (arg: string) => {
                return await bingWebSearch(JSON.parse(arg).query);
            }
        }];

    private toolsForMobileAssistants = [
        {
            name: 'get_mobile_plans',
            description: 'Mobile phone: Get a list of subscription plans. Do not tell customer the fake inforamtion before getting result from this function.',
            parameters: {
                type: 'object',
                properties: {}
            },
            returns: async (arg: string) => {
                let result = [{
                    PlanId: 1,
                    Name: "Unlimited Plan",
                    Description: "Basic Fee:52 dollars, Data:Unlimited",
                    BaseFee: 6480,
                    CallFeePer30Seconds: 22,
                    DataUsageLimit: -1,
                    CallUsageLimit: -1,
                    DataFeePerGB: 0,
                    ListSuitedFor: [
                        "Watch video a lot.",
                        "Play games frequently",
                    ]
                },
                {
                    PlanId: 2,
                    Name: "Basic Plan + 4GB",
                    Description: "Basic Fee:10 dollars, Data:4GB",
                    BaseFee: 980,
                    CallFeePer30Seconds: 22,
                    DataUsageLimit: 4,
                    CallUsageLimit: -1,
                    DataFeePerGB: 500,
                    ListSuitedFor: [
                        "Beginner",
                        "Who doesn't use much internet service",
                    ]
                },
                {
                    PlanId: 3,
                    Name: "Basic Plan + 20GB",
                    Description: "Basic Fee:20 dollars, Data:20GB",
                    BaseFee: 2480,
                    CallFeePer30Seconds: 22,
                    DataUsageLimit: 20,
                    CallUsageLimit: -1,
                    DataFeePerGB: 500,
                    ListSuitedFor: [
                        "Beginner",
                        "Who uses more internet service",
                    ]
                }];

                return JSON.stringify(result);
            }
        }, {
            name: 'get_mobile_option_plans',
            description: 'Mobile phone: Get List of Option Plans. Do not tell customer the fake inforamtion before getting result from this function.',
            parameters: {
                type: 'object',
                properties: {}
            },
            returns: async (arg: string) => {
                let result = [{
                    OptionId: 1,
                    Name: "Basic Warranty Service",
                    Description: "Basic Warranty Service",
                    Fee: "3 dollars",
                },
                {
                    OptionId: 2,
                    Name: "Mobile Security",
                    Description: "Mobile Security",
                    Fee: "4 dollars",
                },
                {
                    OptionId: 3,
                    Name: "PC Security",
                    Description: "PC Security",
                    Fee: "2 dollars",
                },
                {
                    OptionId: 4,
                    Name: "Answering Machine Service",
                    Description: "Answering Machine Service",
                    Fee: "2.5 dollars",
                },
                {
                    OptionId: 5,
                    Name: "GPS Service",
                    Description: "GPS Service",
                    Fee: "1.5 dollars",
                }];

                return JSON.stringify(result);
            }
        }, {
            name: 'get_service_area_failure',
            description: 'Service Area Failure Inquiry: Information on failures occurring in the designated service area. Do not tell customer the fake inforamtion before getting result from this function.',
            parameters: {
                type: 'object',
                properties: {
                    areaName: { type: 'string', description: 'the name of the area' }
                }
            },
            returns: async (arg: string) => `${JSON.parse(arg).areaName} has no failure.`
        }, {
            name: 'get_mobile_service_options',
            description: 'mobile phone: Get current options. Do not tell customer the fake inforamtion before getting result from this function.',
            parameters: {
                type: 'object',
                properties: {
                    userId: { type: 'string', description: 'user id' }
                }
            },
            returns: async (arg: string) => {
                let result = [{
                    Name: "Basic Warranty Service",
                    HasContract: true,
                    NeedRecommendation: false,
                }, {
                    Name: "Mobile Security",
                    HasContract: false,
                    NeedRecommendation: true,
                }, {
                    Name: "PC Security",
                    HasContract: true,
                    NeedRecommendation: false,
                }, {
                    Name: "Answering Machine Service",
                    HasContract: true,
                    NeedRecommendation: true,
                }, {
                    Name: "GPS Service",
                    HasContract: true,
                    NeedRecommendation: false,
                }]

                return JSON.stringify(result);
            }
        }, {
            name: 'get_current_mobile_service_plan',
            description: 'mobile phone: Get current contract/service plan. Do not tell customer the fake plan before getting result from this function.',
            parameters: {
                type: 'object',
                properties: {
                    userId: { type: 'string', description: 'user id' }
                }
            },
            returns: async (arg: string) => "Basic plan: 40GB internet, 100 minutes call."
        }, {
            name: 'get_mobile_billing',
            description: 'mobile phone: Get billing information. Do not tell customer the fake billing information before getting result from this function.',
            parameters: {
                type: 'object',
                properties: {
                    userId: { type: 'string', description: 'user id' },
                    year: { type: 'number', description: 'year' },
                    month: { type: 'number', description: 'month' }
                }
            },
            returns: async (arg: string) => {
                let month = 1;
                if (arg.includes('month')) {
                    month = JSON.parse(arg).month
                }
                return `total${month.toString()}0 dollars. Call usage: ${month.toString()}0 minutes, internet usage: ${month.toString()}0GB`
            }
        }, {
            name: 'get_mobile_service_unpaid_information',
            description: 'mobile phone: Get current unpaid information. Do not tell customer the fake billing information before getting result from this function.',
            parameters: {
                type: 'object',
                properties: {
                    userId: { type: 'string', description: 'user id' }
                }
            },
            returns: async (arg: string) => 'nothing due'
        }, {
            name: 'Assistant_GenericAssistant',
            description: 'If customer asks some question that is outside of your work scope, use this to swtich back to the generic assistant.',
            parameters: {
                type: 'object',
                properties: {}
            },
            returns: async (arg: string) => "Assistant_GenericAssistant"
        }];

    private toolsForShopAssistants = [
        {
            name: 'find_nearby_shops',
            description: 'shop: Find nearby shop of the user.',
            parameters: {
                type: 'object',
                properties: {
                    location: { type: 'string', description: 'location' }
                }
            },
            returns: async (arg: string) => {
                let result = [{
                    StopId: 1,
                    Name: `${location} east store`,
                    BusinessHour: "Every day 11:00 to 20:00",
                    Services: "Sell phones, Teach the basics of how to use phones",
                },
                {
                    StopId: 2,
                    Name: `${location} west store`,
                    BusinessHour: "Monday to Friday 11:00 to 20:00, Saturday 10:00 to 19:00, Sunday off",
                    Services: "Sell phones",
                }];

                return JSON.stringify(result);
            }
        }, {
            name: 'Assistant_GenericAssistant',
            description: 'If customer asks some question that is outside of your work scope, use this to swtich back to the generic assistant.',
            parameters: {
                type: 'object',
                properties: {}
            },
            returns: async (arg: string) => "Assistant_GenericAssistant"
        }];

    public getToolsForAssistant(name: string) {
        let toolsDefinitions: ToolsDefinition = [];
        let toolsToLoad: any[] = [];
        if (name === "GenericAssistant") {
            toolsToLoad = this.toolsForGenericAssistants;
        } else if (name === "MobileAssistant") {
            toolsToLoad = this.toolsForMobileAssistants;
        } else if (name === "ShopAssistant") {
            toolsToLoad = this.toolsForShopAssistants;
        }
        toolsToLoad.forEach(tool => {
            toolsDefinitions.push(
                {
                    type: 'function',
                    name: tool.name,
                    parameters: tool.parameters,
                    description: tool.description,
                });
        });
        return toolsDefinitions;
    }

    public async getToolResponse(toolName: string, parameters: string, call_id: string): Promise<ItemCreateMessage | SessionUpdateMessage> {
        let tools = [...this.toolsForMobileAssistants, ...this.toolsForGenericAssistants, ...this.toolsForShopAssistants];
        let content = await tools.find(tool => tool.name === toolName)!.returns(parameters);
        if (content == "Assistant_MobileAssistant") {
            let configMessage: SessionUpdateMessage = {
                type: "session.update",

                session: {
                    turn_detection: {
                        type: "server_vad",
                    }
                }
            };
            let assistant: [systemMessage: string, tools: any[]] = this.createMobileAssistantConfigMessage();
            configMessage.session.instructions = assistant[0];
            configMessage.session.tools = assistant[1];
            return configMessage;
        } else if (content == "Assistant_ShopAssistant") {
            let configMessage: SessionUpdateMessage = {
                type: "session.update",

                session: {
                    turn_detection: {
                        type: "server_vad",
                    }
                }
            };
            let assistant: [systemMessage: string, tools: any[]] = this.createShopAssistantConfigMessage();
            configMessage.session.instructions = assistant[0];
            configMessage.session.tools = assistant[1];
            return configMessage;
        } else if (content == "Assistant_GenericAssistant") {
            let configMessage: SessionUpdateMessage = {
                type: "session.update",

                session: {
                    turn_detection: {
                        type: "server_vad",
                    }
                }
            };
            let assistant: [systemMessage: string, tools: any[]] = this.createGenericAssistantConfigMessage();
            configMessage.session.instructions = assistant[0];
            configMessage.session.tools = assistant[1];
            return configMessage;
        }
        else {
            let response: ItemCreateMessage = {
                type: 'conversation.item.create',
                item: {
                    type: 'function_call_output',
                    call_id: call_id,
                    output: content
                }
            }
            return response;
        }
    }

    public createGenericAssistantConfigMessage(): [systemMessage: string, tools: object[]] {

        const systemMessage: string = `
        ##Role
        You are an expert, well-training agent for support center.
        You are a native speaker of ${this.language} without any accents.
        You are responsible for supporting customers to identify their needs, so that we can switch to specialized assistant.
        Use function calling to switch to specialized assistant.
        Introduce yourself as "John".

        ##Rules
        - You are in a call with customer. Please provide userful information.
        - When cutomer provides information you ask, add an appreciation message to your reply.
        - If the customer is not satisfied with your answer, you can ask the customer to repeat the question or ask the customer to wait for a while.
        - Reply in ${this.language}
        - You MUST follow the following restrictions

        ##Restrictions
        - DO NOT tell that there are several assistants to support user. You just switch to another one without telling.
        - DO NOT answer any question from the customer as you are not specialized in any field.
        - You DO NOT need any customer identification information as they already have been verified by the system.
        - DO NOT let the customer wait as you cannot push the answer later.`;

        return [systemMessage, this.getToolsForAssistant("GenericAssistant")];
    }

    public createMobileAssistantConfigMessage(): [systemMessage: string, tools: object[]] {

        const systemMessage: string = `
        ## Role
        You are an expert, well-training agent for support center.
        You are a native speaker of ${this.language} without any accents.
        You are responsible for supporting customers with their mobile phone contracted related questions such as billing, getting contract, explain plans, etc.
        All the other unrelated questions should be switched to the generic assistant by using function calling.
        Introduce yourself as "Mike".

        ## Rules
        - You MUST use function calling to get the information before you answers to the customer for their mobile service related query.
        - You are in a call with customer. Please provide userful information.
        - If the customer is not satisfied with your answer, you can ask the customer to repeat the question or ask the customer to wait for a while.
        - When the service plan name or option names are not easy to understand, please rephrase them so that the customer can understand them easily. For example, ""Answering machine plus (with transfer)"" is ""Answering machine"".
        - Reply in ${this.language}
        - You MUST follow the following restrictions

        ## Restrictions
        - You DO NOT need any customer identification information as they already have been verified by the system.
        - DO NOT let the customer wait as you cannot push the answer later.`;

        return [systemMessage, this.getToolsForAssistant("MobileAssistant")];

    }

    public createShopAssistantConfigMessage(): [systemMessage: string, tools: object[]] {

        const systemMessage: string = `
        ##Role
        You are an expert, well-training agent for support center.
        You are a native speaker of ${this.language} without any accents.
        You are responsible for supporting customers to identify their needs for any mobile phone shop related question.
        All the other unrelated questions should be switched to the generic assistant by using function calling.
        Introduce yourself as "Andy".

        ##Rules
        - You are in a call with customer. Please provide userful information.
        - When cutomer provides information you ask, add an appreciation message to your reply.
        - If the customer is not satisfied with your answer, you can ask the customer to repeat the question or ask the customer to wait for a while.
        - Reply in ${this.language}
        - You MUST follow the following restrictions

        ##Restrictions
        - You DO NOT need any customer identification information as they already have been verified by the system.
        - DO NOT let the customer wait as you cannot push the answer later.`;

        return [systemMessage, this.getToolsForAssistant("ShopAssistant")];
    }
}