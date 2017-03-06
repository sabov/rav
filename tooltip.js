var Tooltip = {
  alias: 'tooltip',
  inputs: ['text'],
  state: function() {
    return { isVisible: false };
  },
  methods: {
    show: function() {
      this.setState({ isVisible: true });
    },
    hide: function() {
      this.setState({ isVisible: false });
    },
  },
  template: function() {
    return [
      'div',
      {
        onMouseEnter: 'show',
        onMouseLeave: 'hide',
        className: ['tooltip', {
          'isVisible': 'state.isVisible'
        }]
      },
      [
        'div',
        { className: ['tooltip__content'] },
        'inputs.text'
      ],
      'children'
    ];
  }
};

var events = [
  'onClick', 'onContextMenu', 'onDoubleClick', 'onDrag', 'onDragEnd',
  'onDragEnter', 'onDragExit', 'onDragLeave', 'onDragOver',
  'onDragStart', 'onDrop', 'onMouseDown', 'onMouseEnter', 'onMouseLeave',
  'onMouseMove', 'onMouseOut', 'onMouseOver', 'onMouseUp'
];

if (typeof React !== 'undefined') {
  Tooltip = transformToReact(Tooltip);
} else if (typeof ng !== 'undefined') {
  Tooltip = transformToAngular(Tooltip);
} else if (typeof Vue !== 'undefined') {
  Tooltip = transformToVue(Tooltip);
}

function setReactProps(tpl, ctx) {
  if (!_.isArray(tpl)) {
    var path = tpl
      .replace('inputs', 'props')
      .replace('children', 'props.children');
    return _.get(ctx, path);
  }
  var reactTpl = [
    tpl[0],
    _.transform(tpl[1], function(result, value, key) {
      if(_.includes(events, key)) {
        result[key] = ctx[value];
      } else if (key === 'className') {
        var className = value[0];
        if (value[1]) {
          _.forIn(value[1], function(v, k) {
            if (_.get(ctx, v)) {
              className += ` ${k}`;
            }
          })
        }
        result[key] = className;
      }
    })
  ].concat(tpl.slice(2).map(function(child) {
    return setReactProps(child, ctx);
  }));
  return React.createElement.apply(React, reactTpl);
}

function transformToReact(component) {
  var reactClass = {
    getInitialState: component.state,
    render: function() {
      return setReactProps(component.template(), this);
    }
  }
  reactClass = Object.assign(reactClass, component.methods);
  return React.createClass(reactClass);
}

function buildAngularTpl(tpl) {
  if (!_.isArray(tpl)) {
    return tpl
      .replace(/inputs\.(.*)/, '{{$1}}')
      .replace('children', '<ng-content></ng-content>');
  }
  var el = tpl[0];
  return `
    <${el}
      ${_.values(_.transform(tpl[1], function(result, value, key) {
        if(_.includes(events, key)) {
          result[key] = `(${key.toLowerCase().replace('on', '')})="${value}()"`;
        } else if (key === 'className') {
          result[key] = `class="${value[0]}"`
          if (value[1]) {
            var ngClass = JSON.stringify(value[1]).replace(/"/g, '');
            result[key] += ` [ngClass]="${ngClass}"`;
          }
        }
      })).join(' ')}
    >
      ${tpl.slice(2).map(function(child) {
        return buildAngularTpl(child);
      }).join('')}
    </${el}>
  `;
}

function transformToAngular(component) {
  return ng.core.Component({
    selector: component.alias,
    template: buildAngularTpl(component.template()),
    inputs: component.inputs,
  }).Class(Object.assign({
    constructor: function() {
      this.state = component.state();
    },
    setState: function(state) {
      _.forIn(state, function(v, k) {
        this.state[k] = v;
      }.bind(this))
    }
  }, component.methods));
}

function buildVueTpl(tpl) {
  if (!_.isArray(tpl)) {
    var a = tpl
      .replace(/inputs\.(.*)/, '{{$1}}')
      .replace('children', '<slot></slot>');
    return a;
  }
  var el = tpl[0];
  return `
    <${el}
      ${_.values(_.transform(tpl[1], function(result, value, key) {
        if(_.includes(events, key)) {
          result[key] = `v-on:${key.toLowerCase().replace('on', '')}="${value}"`;
        } else if (key === 'className') {
          result[key] = `class="${value[0]}"`
          if (value[1]) {
            var vueClass = JSON.stringify(value[1]).replace(/"/g, '');
            result[key] += ` v-bind:class="${vueClass}"`;
          }
        }
      })).join(' ')}
    >
      ${tpl.slice(2).map(function(child) {
        return buildVueTpl(child);
      }).join('')}
    </${el}>
  `;
}

function transformToVue(component) {
  Vue.component(component.alias, {
    template: buildVueTpl(component.template()),
    props: component.inputs,
    methods: Object.assign({
      setState: function(state) {
        _.forIn(state, function(v, k) {
          this.state[k] = v;
        }.bind(this))
      }
    }, component.methods),
    data: function() {
      return { state: component.state() };
    }
  });
}
