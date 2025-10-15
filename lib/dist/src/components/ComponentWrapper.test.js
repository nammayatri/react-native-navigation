"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const react_native_1 = require("react-native");
const renderer = tslib_1.__importStar(require("react-test-renderer"));
const ComponentWrapper_1 = require("./ComponentWrapper");
const Store_1 = require("./Store");
const ts_mockito_1 = require("ts-mockito");
const ComponentEventsObserver_1 = require("../events/ComponentEventsObserver");
describe('ComponentWrapper', () => {
    const componentName = 'example.MyComponent';
    let store;
    let myComponentProps;
    let mockedComponentEventsObserver;
    let componentEventsObserver;
    let uut;
    class MyComponent extends React.Component {
        static options = {
            title: 'MyComponentTitle',
        };
        render() {
            myComponentProps = this.props;
            if (this.props.renderCount) {
                this.props.renderCount();
            }
            return React.createElement(react_native_1.Text, null, this.props.text || 'Hello, World!');
        }
    }
    class TestParent extends React.Component {
        ChildClass;
        constructor(props) {
            super(props);
            this.ChildClass = props.ChildClass;
            this.state = { propsFromState: {} };
        }
        render() {
            const { ChildClass } = this;
            return React.createElement(ChildClass, { componentId: "component1", ...this.state.propsFromState });
        }
    }
    beforeEach(() => {
        store = new Store_1.Store();
        mockedComponentEventsObserver = (0, ts_mockito_1.mock)(ComponentEventsObserver_1.ComponentEventsObserver);
        componentEventsObserver = (0, ts_mockito_1.instance)(mockedComponentEventsObserver);
        uut = new ComponentWrapper_1.ComponentWrapper();
    });
    it('must have componentId as prop', () => {
        const NavigationComponent = uut.wrap(componentName, () => MyComponent, store, componentEventsObserver);
        const orig = console.error;
        console.error = (a) => a;
        expect(() => {
            renderer.create(React.createElement(NavigationComponent, null));
        }).toThrowError('Component example.MyComponent does not have a componentId!');
        console.error = orig;
    });
    it('wraps the component', () => {
        const NavigationComponent = uut.wrap(componentName, () => MyComponent, store, componentEventsObserver);
        expect(NavigationComponent).not.toBeInstanceOf(MyComponent);
        const tree = renderer.create(React.createElement(NavigationComponent, { componentId: 'component1' }));
        expect(tree.toJSON().children).toEqual(['Hello, World!']);
    });
    it('injects props from wrapper into original component', () => {
        const renderCount = jest.fn();
        const NavigationComponent = uut.wrap(componentName, () => MyComponent, store, componentEventsObserver);
        const tree = renderer.create(React.createElement(NavigationComponent, { componentId: 'component1', text: 'yo', renderCount: renderCount }));
        expect(tree.toJSON().children).toEqual(['yo']);
        expect(renderCount).toHaveBeenCalledTimes(1);
    });
    it('updates props from wrapper into original component on state change', () => {
        const NavigationComponent = uut.wrap(componentName, () => MyComponent, store, componentEventsObserver);
        const tree = renderer.create(React.createElement(TestParent, { ChildClass: NavigationComponent }));
        expect(myComponentProps.foo).toEqual(undefined);
        tree.getInstance().setState({ propsFromState: { foo: 'yo' } });
        expect(myComponentProps.foo).toEqual('yo');
    });
    it('pulls props from the store and injects them into the inner component', () => {
        store.updateProps('component123', { numberProp: 1, stringProp: 'hello', objectProp: { a: 2 } });
        const NavigationComponent = uut.wrap(componentName, () => MyComponent, store, componentEventsObserver);
        renderer.create(React.createElement(NavigationComponent, { componentId: 'component123' }));
        expect(myComponentProps).toEqual({
            componentId: 'component123',
            componentName,
            numberProp: 1,
            stringProp: 'hello',
            objectProp: { a: 2 },
        });
    });
    it('update props with callback', (done) => {
        const NavigationComponent = uut.wrap(componentName, () => MyComponent, store, componentEventsObserver);
        renderer.create(React.createElement(NavigationComponent, { componentId: 'component123' }));
        function callback() {
            try {
                expect(true).toBe(true);
                done();
            }
            catch (error) {
                done(error);
            }
        }
        store.updateProps('component123', { someProp: 'someValue' }, callback);
    });
    it('updates props from store into inner component', () => {
        const NavigationComponent = uut.wrap(componentName, () => MyComponent, store, componentEventsObserver);
        renderer.create(React.createElement(TestParent, { ChildClass: NavigationComponent }));
        expect(myComponentProps.myProp).toEqual(undefined);
        store.updateProps('component1', { myProp: 'hello' });
        expect(myComponentProps.myProp).toEqual('hello');
    });
    it('updates props from state into inner component', () => {
        const NavigationComponent = uut.wrap(componentName, () => MyComponent, store, componentEventsObserver);
        const tree = renderer.create(React.createElement(TestParent, { ChildClass: NavigationComponent }));
        expect(myComponentProps.foo).toEqual(undefined);
        tree.getInstance().setState({ propsFromState: { foo: 'yo' } });
        expect(myComponentProps.foo).toEqual('yo');
    });
    it('protects id from change', () => {
        const NavigationComponent = uut.wrap(componentName, () => MyComponent, store, componentEventsObserver);
        const tree = renderer.create(React.createElement(TestParent, { ChildClass: NavigationComponent }));
        expect(myComponentProps.componentId).toEqual('component1');
        tree.getInstance().setState({ propsFromState: { id: 'ERROR' } });
        expect(myComponentProps.componentId).toEqual('component1');
    });
    xit('assigns key by componentId', () => {
        const NavigationComponent = uut.wrap(componentName, () => MyComponent, store, componentEventsObserver);
        const tree = renderer.create(React.createElement(NavigationComponent, { componentId: 'component1' }));
        expect(myComponentProps.componentId).toEqual('component1');
        console.log(Object.keys(tree.root.findByType(NavigationComponent).instance._reactInternalFiber));
        console.log(tree.root.findByType(NavigationComponent).instance._reactInternalFiber.child.child.child
            .return.return.key);
        expect(tree.getInstance()._reactInternalInstance.child.child.Fibernode.key).toEqual('component1');
    });
    it('cleans props from store on unMount', () => {
        store.updateProps('component123', { foo: 'bar' });
        const NavigationComponent = uut.wrap(componentName, () => MyComponent, store, componentEventsObserver);
        const tree = renderer.create(React.createElement(NavigationComponent, { componentId: 'component123' }));
        expect(store.getPropsForId('component123')).toEqual({ foo: 'bar' });
        tree.unmount();
        expect(store.getPropsForId('component123')).toEqual({});
    });
    it('merges static members from wrapped component when generated', () => {
        const NavigationComponent = uut.wrap(componentName, () => MyComponent, store, componentEventsObserver);
        expect(NavigationComponent.options).toEqual({ title: 'MyComponentTitle' });
    });
    it('calls unmounted on componentEventsObserver', () => {
        const NavigationComponent = uut.wrap(componentName, () => MyComponent, store, componentEventsObserver);
        const tree = renderer.create(React.createElement(NavigationComponent, { componentId: 'component123' }));
        (0, ts_mockito_1.verify)(mockedComponentEventsObserver.unmounted('component123')).never();
        tree.unmount();
        (0, ts_mockito_1.verify)(mockedComponentEventsObserver.unmounted('component123')).once();
    });
    it('renders HOC components correctly', () => {
        const generator = () => (props) => (React.createElement(react_native_1.View, null,
            React.createElement(MyComponent, { ...props })));
        uut = new ComponentWrapper_1.ComponentWrapper();
        const NavigationComponent = uut.wrap(componentName, generator, store, componentEventsObserver);
        const tree = renderer.create(React.createElement(NavigationComponent, { componentId: 'component123' }));
        expect(tree.root.findByType(react_native_1.View)).toBeDefined();
        expect(tree.root.findByType(MyComponent).props).toEqual({
            componentId: 'component123',
            componentName,
        });
    });
    it('sets component instance in store when constructed', () => {
        const NavigationComponent = uut.wrap(componentName, () => MyComponent, store, componentEventsObserver);
        renderer.create(React.createElement(NavigationComponent, { componentId: 'component1' }));
        expect(store.getComponentInstance('component1')).toBeTruthy();
    });
    it('Component generator is invoked only once', () => {
        const componentGenerator = jest.fn(() => MyComponent);
        uut.wrap(componentName, componentGenerator, store, componentEventsObserver);
        expect(componentGenerator.mock.calls.length).toBe(1);
    });
    describe(`register with redux store`, () => {
        class MyReduxComp extends React.Component {
            static options() {
                return { foo: 123 };
            }
            render() {
                return React.createElement(react_native_1.Text, null, this.props.txt);
            }
        }
        function mapStateToProps(state) {
            return {
                txt: state.txt,
            };
        }
        const ConnectedComp = require('react-redux').connect(mapStateToProps)(MyReduxComp);
        const ReduxProvider = require('react-redux').Provider;
        const initialState = { txt: 'it just works' };
        const reduxStore = require('redux').createStore((state = initialState) => state);
        it(`wraps the component with a react-redux provider with passed store`, () => {
            const NavigationComponent = uut.wrap(componentName, () => ConnectedComp, store, componentEventsObserver, undefined, ReduxProvider, reduxStore);
            const tree = renderer.create(React.createElement(NavigationComponent, { componentId: 'theCompId' }));
            expect(tree.toJSON().children).toEqual(['it just works']);
            expect(NavigationComponent.options()).toEqual({ foo: 123 });
        });
    });
    it('initialize isMounted with false value', () => {
        const NavigationComponent = uut.wrap(componentName, () => MyComponent, store, componentEventsObserver);
        new NavigationComponent({ componentId: 'component123' });
        expect(store.getComponentInstance('component123')?.isMounted).toEqual(false);
    });
    it('updates isMounted on componentDidMount', () => {
        const NavigationComponent = uut.wrap(componentName, () => MyComponent, store, componentEventsObserver);
        renderer.create(React.createElement(NavigationComponent, { componentId: 'component123' }));
        expect(store.getComponentInstance('component123')?.isMounted).toEqual(true);
    });
    it('clears isMounted on componentDidUnmount', () => {
        const NavigationComponent = uut.wrap(componentName, () => MyComponent, store, componentEventsObserver);
        const tree = renderer.create(React.createElement(NavigationComponent, { componentId: 'component123' }));
        expect(store.getComponentInstance('component123')?.isMounted).toEqual(true);
        tree.unmount();
        expect(store.getComponentInstance('component123')?.isMounted).toBeUndefined();
    });
});
